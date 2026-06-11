const db = require("../config/db");
const esc = (name) => `\`${String(name).replace(/`/g, "")}\``;

const SECTIONS = {
  general:           { title:"General Settings",          table:"settings",                type:"keyValue", group:"general"  },
  company:           { title:"Company / Business Settings",table:"settings",               type:"keyValue", group:"company"  },
  invoice:           { title:"Invoice Settings",           table:"invoice_settings",        type:"row"                       },
  gst:               { title:"GST Settings",               table:"gst_settings",            type:"row"                       },
  "payment-gateway": { title:"Payment Gateway Settings",   table:"payment_gateway_settings",type:"row"                       },
  payment:           { title:"Payment Gateway Settings",   table:"payment_gateway_settings",type:"row"                       },
  email:             { title:"Email Settings",             table:"email_settings",          type:"row"                       },
  sms:               { title:"SMS / OTP Settings",         table:"sms_settings",            type:"row"                       },
  security:          { title:"Security Settings",          table:"security_settings",       type:"row"                       },
  "customer-website":{ title:"Customer Website Settings",  table:"settings",                type:"keyValue", group:"customer_website" },
  backup:            { title:"Backup Settings",            table:"backups",                 type:"list"                      },
  activity:          { title:"System Logs",                table:"activity_logs",           type:"logs"                      },
};

const LOG_TABLES = ["activity_logs","audit_logs","login_logs","system_logs"];

const tableExists = async (t) => { const [r] = await db.query("SHOW TABLES LIKE ?",[t]); return r.length>0; };
const getColumns  = async (t) => { if(!(await tableExists(t))) return []; const [r]=await db.query(`SHOW COLUMNS FROM ${esc(t)}`); return r.map(x=>x.Field); };
const pickCol = (cols,names) => names.find(n=>cols.includes(n));
const parseValue  = (v) => { if(v===null||v===undefined) return ""; if(typeof v!=="string") return v; try { if((v.trim().startsWith("{")||v.trim().startsWith("["))&&(v.trim().endsWith("}")||v.trim().endsWith("]"))) return JSON.parse(v); } catch{} return v; };
const stringifyValue = (v) => { if(v===null||v===undefined) return ""; if(typeof v==="object") return JSON.stringify(v); return String(v); };
const fallback = (s) => ({ section:s, title:SECTIONS[s]?.title||s, table:SECTIONS[s]?.table||null, table_exists:false, data:{} });

const getKeyValueSection = async (section, cfg) => {
  const cols=await getColumns(cfg.table); if(!cols.length) return fallback(section);
  const kc=pickCol(cols,["setting_key","config_key","key","name"]),vc=pickCol(cols,["setting_value","config_value","value"]),gc=pickCol(cols,["setting_group","group_name","module","category"]);
  if(!kc||!vc) return getRowSection(section,{...cfg,type:"row"});
  let sql=`SELECT * FROM ${esc(cfg.table)}`; const p=[];
  if(gc&&cfg.group){sql+=` WHERE ${esc(gc)} = ?`;p.push(cfg.group);}
  const [rows]=await db.query(sql,p); const data={};
  rows.forEach(r=>{const k=r[kc];if(k)data[k]=parseValue(r[vc]);});
  return {section,title:cfg.title,table:cfg.table,table_exists:true,mode:"keyValue",data};
};

const getRowSection = async (section, cfg) => {
  const cols=await getColumns(cfg.table); if(!cols.length) return fallback(section);
  const ord=cols.includes("id")?"ORDER BY id DESC":"";
  const [rows]=await db.query(`SELECT * FROM ${esc(cfg.table)} ${ord} LIMIT 1`);
  const row=rows[0]||{}; const data={};
  const skip=["id","created_at","updated_at","created_by","updated_by"];
  cols.forEach(c=>{ if(skip.includes(c)) return; data[c]=(row[c]!==undefined&&row[c]!==null)?row[c]:""; });
  return {section,title:cfg.title,table:cfg.table,table_exists:true,mode:"row",id:row.id||null,data};
};

const getListSection = async (section, cfg) => {
  const cols=await getColumns(cfg.table); if(!cols.length) return fallback(section);
  const ord=cols.includes("created_at")?"ORDER BY created_at DESC":cols.includes("id")?"ORDER BY id DESC":"";
  const [rows]=await db.query(`SELECT * FROM ${esc(cfg.table)} ${ord} LIMIT 100`);
  return {section,title:cfg.title,table:cfg.table,table_exists:true,mode:"list",data:rows};
};

const getSection = async (s) => {
  const cfg=SECTIONS[s]; if(!cfg) return fallback(s);
  if(cfg.type==="keyValue") return getKeyValueSection(s,cfg);
  if(cfg.type==="row")      return getRowSection(s,cfg);
  if(cfg.type==="list")     return getListSection(s,cfg);
  return fallback(s);
};

const updateKeyValueSection = async (section, cfg, body, userId) => {
  const cols=await getColumns(cfg.table); if(!cols.length) return {success:false,message:`${cfg.table} table not found`};
  const kc=pickCol(cols,["setting_key","config_key","key","name"]),vc=pickCol(cols,["setting_value","config_value","value"]),gc=pickCol(cols,["setting_group","group_name","module","category"]);
  if(!kc||!vc) return updateRowSection(section,{...cfg,type:"row"},body,userId);
  for(const key of Object.keys(body||{})){
    const value=stringifyValue(body[key]);
    let where=`${esc(kc)} = ?`; const p=[key];
    if(gc&&cfg.group){where+=` AND ${esc(gc)} = ?`;p.push(cfg.group);}
    const [ex]=await db.query(`SELECT id FROM ${esc(cfg.table)} WHERE ${where} LIMIT 1`,p);
    if(ex.length){
      const uc=[vc],uv=[value];
      if(cols.includes("updated_at")){uc.push("updated_at");uv.push(new Date());}
      uv.push(ex[0].id);
      await db.query(`UPDATE ${esc(cfg.table)} SET ${uc.map(c=>`${esc(c)} = ?`).join(",")} WHERE id = ?`,uv);
    } else {
      const ic=[kc,vc],iv=[key,value];
      if(gc&&cfg.group){ic.push(gc);iv.push(cfg.group);}
      await db.query(`INSERT INTO ${esc(cfg.table)} (${ic.map(esc).join(",")}) VALUES (${ic.map(()=>"?").join(",")})`,iv);
    }
  }
  return {success:true};
};

const updateRowSection = async (section, cfg, body) => {
  const cols=await getColumns(cfg.table); if(!cols.length) return {success:false,message:`${cfg.table} table not found`};
  const skip=["id","created_at","updated_at","created_by","updated_by"];
  const keys=Object.keys(body||{}).filter(k=>cols.includes(k)&&!skip.includes(k));
  if(!keys.length) return {success:false,message:"No matching columns found"};
  const ord=cols.includes("id")?"ORDER BY id DESC":"";
  const [rows]=await db.query(`SELECT * FROM ${esc(cfg.table)} ${ord} LIMIT 1`);
  if(rows.length){
    const uc=[...keys],uv=keys.map(k=>body[k]);
    if(cols.includes("updated_at")){uc.push("updated_at");uv.push(new Date());}
    uv.push(rows[0].id);
    await db.query(`UPDATE ${esc(cfg.table)} SET ${uc.map(c=>`${esc(c)} = ?`).join(",")} WHERE id = ?`,uv);
  } else {
    const ic=[...keys],iv=keys.map(k=>body[k]);
    if(cols.includes("created_at")){ic.push("created_at");iv.push(new Date());}
    await db.query(`INSERT INTO ${esc(cfg.table)} (${ic.map(esc).join(",")}) VALUES (${ic.map(()=>"?").join(",")})`,iv);
  }
  return {success:true};
};

const getSettingsSummary = async (req, res) => {
  try {
    const sections=[]; let totalRecords=0; let lastUpdated=null;
    const seen=new Set();
    for(const [s,cfg] of Object.entries(SECTIONS)){
      if(seen.has(cfg.table)){continue;} seen.add(cfg.table);
      const exists=await tableExists(cfg.table); let records=0; let sectionUpdated=null;
      if(exists){
        const [rc]=await db.query(`SELECT COUNT(*) AS total FROM ${esc(cfg.table)}`);
        records=Number(rc[0]?.total||0); totalRecords+=records;
        const tcols=await getColumns(cfg.table);
        if(tcols.includes("updated_at")){
          const [ud]=await db.query(`SELECT updated_at FROM ${esc(cfg.table)} ORDER BY updated_at DESC LIMIT 1`);
          if(ud[0]?.updated_at){sectionUpdated=ud[0].updated_at; if(!lastUpdated||new Date(sectionUpdated)>new Date(lastUpdated))lastUpdated=sectionUpdated;}
        }
      }
      sections.push({section:s,title:cfg.title,table:cfg.table,table_exists:exists,records});
    }
    res.json({success:true,total_settings:totalRecords,active_settings:0,inactive_settings:0,last_updated:lastUpdated,sections,summary:sections});
  } catch(e){console.error(e);res.status(500).json({success:false,message:"Failed to load settings summary",error:e.message});}
};

const getSettingsSection = async (req, res) => {
  try { const data=await getSection(req.params.section); res.json({success:true,...data}); }
  catch(e){console.error(e);res.status(500).json({success:false,message:"Failed to load settings",error:e.message});}
};

const updateSettingsSection = async (req, res) => {
  try {
    const s=req.params.section; const cfg=SECTIONS[s];
    if(!cfg) return res.status(404).json({success:false,message:"Invalid settings section"});
    if(["list","logs"].includes(cfg.type)) return res.status(400).json({success:false,message:"This section is read-only"});
    const result=cfg.type==="keyValue"?await updateKeyValueSection(s,cfg,req.body,req.user?.id):await updateRowSection(s,cfg,req.body,req.user?.id);
    if(!result.success) return res.status(400).json(result);
    const updated=await getSection(s);
    res.json({success:true,message:`${cfg.title} updated successfully`,...updated});
  } catch(e){console.error(e);res.status(500).json({success:false,message:"Failed to update settings",error:e.message});}
};

const getActivityLogs = async (req, res) => {
  try {
    const rows=[];
    for(const t of LOG_TABLES){
      if(!(await tableExists(t))) continue;
      const cols=await getColumns(t);
      const ord=cols.includes("created_at")?"ORDER BY created_at DESC":cols.includes("id")?"ORDER BY id DESC":"";
      const [tableRows]=await db.query(`SELECT * FROM ${esc(t)} ${ord} LIMIT 100`);
      tableRows.forEach(r=>rows.push({source_table:t,...r}));
    }
    rows.sort((a,b)=>{
      const da=a.created_at?new Date(a.created_at):0, db2=b.created_at?new Date(b.created_at):0;
      return db2-da;
    });
    res.json({success:true,data:rows.slice(0,100)});
  } catch(e){console.error(e);res.status(500).json({success:false,message:"Failed to load logs",error:e.message});}
};

const createBackupRecord = async (req, res) => {
  try {
    const t="backups"; const cols=await getColumns(t);
    if(!cols.length) return res.status(404).json({success:false,message:"backups table not found"});
    const payload={backup_name:req.body.backup_name||`Manual Backup ${new Date().toISOString()}`,backup_type:req.body.backup_type||"manual",status:req.body.status||"pending",file_path:req.body.file_path||null,created_by:req.user?.id||null,created_at:new Date()};
    const keys=Object.keys(payload).filter(k=>cols.includes(k));
    await db.query(`INSERT INTO ${esc(t)} (${keys.map(esc).join(",")}) VALUES (${keys.map(()=>"?").join(",")})`,keys.map(k=>payload[k]));
    res.json({success:true,message:"Backup record created successfully"});
  } catch(e){console.error(e);res.status(500).json({success:false,message:"Failed to create backup record",error:e.message});}
};

const uploadWebsiteImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const url = `/uploads/website/${req.file.filename}`;
    res.json({ success: true, url });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getSettingsSummary, getSettingsSection, updateSettingsSection, getActivityLogs, createBackupRecord, uploadWebsiteImage };