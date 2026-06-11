const db = require("../config/db");
const bcrypt = require("bcryptjs");

const SAFE = `u.id,u.name,u.email,u.phone,u.avatar,u.user_type,u.status,u.last_login_at,u.created_at,u.updated_at`;
const MODULES_LIST = ["Dashboard","Procurement","Inventory","Warehouse","Products","Vendors","Customers","Orders","Delivery","Finance","GST","Reports","Settings","User Management"];
const tblExists = async (t) => { const [r]=await db.query("SHOW TABLES LIKE ?",[t]); return r.length>0; };

/*  USERS  */
exports.getUsersSummary = async (req, res) => {
  try {
    const [[{total}]]=await db.query(`SELECT COUNT(*) AS total FROM users`);
    const [[{active}]]=await db.query(`SELECT COUNT(*) AS active FROM users WHERE status='active'`);
    const [[{inactive}]]=await db.query(`SELECT COUNT(*) AS inactive FROM users WHERE status='inactive'`);
    const [[{blocked}]]=await db.query(`SELECT COUNT(*) AS blocked FROM users WHERE status='blocked'`);
    const [[{roles}]]=await db.query(`SELECT COUNT(*) AS roles FROM roles`);
    res.json({success:true,total_users:total,active_users:active,inactive_users:inactive,blocked_users:blocked,total_roles:roles});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getUsers = async (req, res) => {
  try {
    const {search='',status='',role_id='',page=1,limit=50}=req.query;
    const off=(Number(page)-1)*Number(limit);
    const where=['1=1'],p=[];
    if(search){where.push(`(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`);p.push(`%${search}%`,`%${search}%`,`%${search}%`);}
    if(status){where.push(`u.status=?`);p.push(status);}
    if(role_id){where.push(`ur.role_id=?`);p.push(role_id);}
    const [rows]=await db.query(`SELECT ${SAFE},r.display_name AS role_name,r.id AS role_id FROM users u LEFT JOIN user_roles ur ON u.id=ur.user_id LEFT JOIN roles r ON ur.role_id=r.id WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,[...p,Number(limit),off]);
    const [[{total}]]=await db.query(`SELECT COUNT(DISTINCT u.id) AS total FROM users u LEFT JOIN user_roles ur ON u.id=ur.user_id WHERE ${where.join(' AND ')}`,p);
    res.json({success:true,data:rows,total,page:Number(page),limit:Number(limit)});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getUser = async (req, res) => {
  try {
    const [rows]=await db.query(`SELECT ${SAFE},r.display_name AS role_name,r.id AS role_id FROM users u LEFT JOIN user_roles ur ON u.id=ur.user_id LEFT JOIN roles r ON ur.role_id=r.id WHERE u.id=? LIMIT 1`,[req.params.id]);
    if(!rows.length) return res.status(404).json({success:false,message:"User not found"});
    res.json({success:true,data:rows[0]});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.createUser = async (req, res) => {
  try {
    const {name,email,phone,password,user_type='staff',status='active',role_id}=req.body;
    if(!name||!email||!password) return res.status(400).json({success:false,message:"name, email and password are required"});
    const hash=await bcrypt.hash(password,10);
    const [r]=await db.query(`INSERT INTO users (name,email,phone,password,user_type,status) VALUES (?,?,?,?,?,?)`,[name,email,phone||null,hash,user_type,status]);
    if(role_id) await db.query(`INSERT IGNORE INTO user_roles (user_id,role_id) VALUES (?,?)`,[r.insertId,role_id]);
    res.status(201).json({success:true,message:"User created",id:r.insertId});
  } catch(e){
    if(e.code==='ER_DUP_ENTRY') return res.status(400).json({success:false,message:"Email already exists"});
    res.status(500).json({success:false,message:e.message});
  }
};

exports.updateUser = async (req, res) => {
  try {
    const {name,email,phone,avatar,user_type,role_id}=req.body; const {id}=req.params;
    const sets=[],p=[];
    if(name!==undefined){sets.push('name=?');p.push(name);}
    if(email!==undefined){sets.push('email=?');p.push(email);}
    if(phone!==undefined){sets.push('phone=?');p.push(phone);}
    if(avatar!==undefined){sets.push('avatar=?');p.push(avatar);}
    if(user_type!==undefined){sets.push('user_type=?');p.push(user_type);}
    if(sets.length){p.push(id);await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`,p);}
    if(role_id!==undefined){
      await db.query(`DELETE FROM user_roles WHERE user_id=?`,[id]);
      if(role_id) await db.query(`INSERT IGNORE INTO user_roles (user_id,role_id) VALUES (?,?)`,[id,role_id]);
    }
    res.json({success:true,message:"User updated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateUserStatus = async (req, res) => {
  try {
    const {status}=req.body; const {id}=req.params;
    if(!['active','inactive','blocked'].includes(status)) return res.status(400).json({success:false,message:"Invalid status. Use active, inactive or blocked"});
    const [[user]]=await db.query(`SELECT user_type FROM users WHERE id=?`,[id]);
    if(!user) return res.status(404).json({success:false,message:"User not found"});
    if(user.user_type==='super_admin') return res.status(403).json({success:false,message:"Cannot change super admin status"});
    await db.query(`UPDATE users SET status=? WHERE id=?`,[status,id]);
    res.json({success:true,message:`User status updated to ${status}`});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateUserPassword = async (req, res) => {
  try {
    const {password}=req.body; const {id}=req.params;
    if(!password||String(password).length<6) return res.status(400).json({success:false,message:"Password must be at least 6 characters"});
    const hash=await bcrypt.hash(password,10);
    await db.query(`UPDATE users SET password=? WHERE id=?`,[hash,id]);
    res.json({success:true,message:"Password updated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.forcePasswordReset = async (req, res) => {
  try {
    const {id}=req.params;
    const tmp='Reset@'+Math.random().toString(36).slice(-6).toUpperCase();
    const hash=await bcrypt.hash(tmp,10);
    await db.query(`UPDATE users SET password=? WHERE id=?`,[hash,id]);
    res.json({success:true,message:"Password force-reset. Share temp password with user.",temp_password:tmp});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.deleteUser = async (req, res) => {
  try {
    const {id}=req.params;
    const [[user]]=await db.query(`SELECT user_type FROM users WHERE id=?`,[id]);
    if(!user) return res.status(404).json({success:false,message:"User not found"});
    if(user.user_type==='super_admin') return res.status(403).json({success:false,message:"Cannot delete super admin"});
    await db.query(`DELETE FROM user_roles WHERE user_id=?`,[id]);
    await db.query(`DELETE FROM users WHERE id=?`,[id]);
    res.json({success:true,message:"User deleted"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

/*  ROLES  */
exports.getRolesSummary = async (req, res) => {
  try {
    const [[{total}]]=await db.query(`SELECT COUNT(*) AS total FROM roles`);
    const [[{active}]]=await db.query(`SELECT COUNT(*) AS active FROM roles WHERE status='active'`);
    const [[{inactive}]]=await db.query(`SELECT COUNT(*) AS inactive FROM roles WHERE status='inactive'`);
    res.json({success:true,total_roles:total,active_roles:active,inactive_roles:inactive});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getRoles = async (req, res) => {
  try {
    const [rows]=await db.query(`SELECT r.*,(SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id=r.id) AS user_count FROM roles r ORDER BY r.created_at ASC`);
    res.json({success:true,data:rows});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getRole = async (req, res) => {
  try {
    const [rows]=await db.query(`SELECT * FROM roles WHERE id=?`,[req.params.id]);
    if(!rows.length) return res.status(404).json({success:false,message:"Role not found"});
    res.json({success:true,data:rows[0]});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.createRole = async (req, res) => {
  try {
    const {name,display_name,description,status='active'}=req.body;
    if(!name||!display_name) return res.status(400).json({success:false,message:"name and display_name are required"});
    const [r]=await db.query(`INSERT INTO roles (name,display_name,description,status) VALUES (?,?,?,?)`,[name,display_name,description||null,status]);
    res.status(201).json({success:true,message:"Role created",id:r.insertId});
  } catch(e){
    if(e.code==='ER_DUP_ENTRY') return res.status(400).json({success:false,message:"Role name already exists"});
    res.status(500).json({success:false,message:e.message});
  }
};

exports.updateRole = async (req, res) => {
  try {
    const {display_name,description,status}=req.body; const {id}=req.params;
    const sets=[],p=[];
    if(display_name!==undefined){sets.push('display_name=?');p.push(display_name);}
    if(description!==undefined){sets.push('description=?');p.push(description);}
    if(status!==undefined){sets.push('status=?');p.push(status);}
    if(sets.length){p.push(id);await db.query(`UPDATE roles SET ${sets.join(',')} WHERE id=?`,p);}
    res.json({success:true,message:"Role updated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateRoleStatus = async (req, res) => {
  try {
    const {status}=req.body; const {id}=req.params;
    if(!['active','inactive'].includes(status)) return res.status(400).json({success:false,message:"Invalid status"});
    const [[role]]=await db.query(`SELECT name FROM roles WHERE id=?`,[id]);
    if(!role) return res.status(404).json({success:false,message:"Role not found"});
    if(role.name==='super_admin') return res.status(403).json({success:false,message:"Cannot change super admin role status"});
    await db.query(`UPDATE roles SET status=? WHERE id=?`,[status,id]);
    res.json({success:true,message:"Role status updated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.deleteRole = async (req, res) => {
  try {
    const {id}=req.params;
    const [[role]]=await db.query(`SELECT name FROM roles WHERE id=?`,[id]);
    if(!role) return res.status(404).json({success:false,message:"Role not found"});
    if(role.name==='super_admin') return res.status(403).json({success:false,message:"Cannot delete super admin role"});
    const [[{uc}]]=await db.query(`SELECT COUNT(*) AS uc FROM user_roles WHERE role_id=?`,[id]);
    if(Number(uc)>0) return res.status(400).json({success:false,message:`${uc} users assigned to this role. Reassign before deleting.`});
    await db.query(`DELETE FROM role_permissions WHERE role_id=?`,[id]);
    await db.query(`DELETE FROM roles WHERE id=?`,[id]);
    res.json({success:true,message:"Role deleted"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

/*  PERMISSIONS  */
exports.getPermissions = async (req, res) => {
  try {
    const [rows]=await db.query(`SELECT * FROM permissions WHERE status='active' ORDER BY module,action`);
    res.json({success:true,data:rows});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getRolePermissions = async (req, res) => {
  try {
    const {roleId}=req.params;
    const [rows]=await db.query(`SELECT rp.permission_id,p.module,p.action,p.name,p.display_name FROM role_permissions rp JOIN permissions p ON rp.permission_id=p.id WHERE rp.role_id=?`,[roleId]);
    res.json({success:true,data:rows,permission_ids:rows.map(r=>r.permission_id)});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const {roleId}=req.params; const {permission_ids=[]}=req.body;
    await db.query(`DELETE FROM role_permissions WHERE role_id=?`,[roleId]);
    if(permission_ids.length){
      const vals=permission_ids.map(pid=>[Number(roleId),Number(pid)]);
      await db.query(`INSERT IGNORE INTO role_permissions (role_id,permission_id) VALUES ?`,[vals]);
    }
    res.json({success:true,message:"Role permissions updated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

/*  OUTLETS  */
exports.getOutlets = async (req, res) => {
  try {
    const [rows]=await db.query(`SELECT id,outlet_code,name,city,state,status FROM outlets ORDER BY name`);
    res.json({success:true,data:rows});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getUserOutlets = async (req, res) => {
  try {
    const {userId}=req.params;
    if(!(await tblExists('user_outlets'))) return res.json({success:true,data:[],outlet_ids:[],table_missing:true});
    const [rows]=await db.query(`SELECT uo.outlet_id,o.name,o.outlet_code FROM user_outlets uo JOIN outlets o ON uo.outlet_id=o.id WHERE uo.user_id=?`,[userId]);
    res.json({success:true,data:rows,outlet_ids:rows.map(r=>r.outlet_id)});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateUserOutlets = async (req, res) => {
  try {
    const {userId}=req.params; const {outlet_ids=[]}=req.body;
    if(!(await tblExists('user_outlets'))) return res.status(503).json({success:false,message:"user_outlets table not found. Run SQL: CREATE TABLE IF NOT EXISTS user_outlets (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, outlet_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_user_outlet (user_id, outlet_id));"});
    await db.query(`DELETE FROM user_outlets WHERE user_id=?`,[userId]);
    if(outlet_ids.length){
      const vals=outlet_ids.map(oid=>[Number(userId),Number(oid)]);
      await db.query(`INSERT IGNORE INTO user_outlets (user_id,outlet_id) VALUES ?`,[vals]);
    }
    res.json({success:true,message:"User outlet access updated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

/*  MODULES  */
exports.getModules = async (req, res) => {
  try {
    const data=MODULES_LIST.map((m,i)=>({id:i+1,module_key:m.toLowerCase().replace(/[\s/]+/g,'_'),module_name:m}));
    res.json({success:true,data});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getUserModules = async (req, res) => {
  try {
    const {userId}=req.params;
    if(await tblExists('user_module_access')){
      const [rows]=await db.query(`SELECT module_key,can_access FROM user_module_access WHERE user_id=?`,[userId]);
      return res.json({success:true,data:rows,module_keys:rows.filter(r=>r.can_access).map(r=>r.module_key)});
    }
    const [perms]=await db.query(`SELECT DISTINCT p.module FROM user_roles ur JOIN role_permissions rp ON ur.role_id=rp.role_id JOIN permissions p ON rp.permission_id=p.id WHERE ur.user_id=?`,[userId]);
    const keys=perms.map(p=>p.module.toLowerCase().replace(/[\s/]+/g,'_'));
    res.json({success:true,data:keys.map(k=>({module_key:k,can_access:true})),module_keys:keys});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateUserModules = async (req, res) => {
  try {
    const {userId}=req.params; const {module_keys=[]}=req.body;
    if(!(await tblExists('user_module_access'))) return res.status(503).json({success:false,message:"user_module_access table not found. Run SQL: CREATE TABLE IF NOT EXISTS user_module_access (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, module_key VARCHAR(100) NOT NULL, can_access BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY unique_user_module (user_id, module_key));"});
    await db.query(`DELETE FROM user_module_access WHERE user_id=?`,[userId]);
    if(module_keys.length){
      const vals=module_keys.map(k=>[Number(userId),k,1]);
      await db.query(`INSERT IGNORE INTO user_module_access (user_id,module_key,can_access) VALUES ?`,[vals]);
    }
    res.json({success:true,message:"User module access updated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getRoleModules = async (req, res) => {
  try {
    const {roleId}=req.params;
    const [perms]=await db.query(`SELECT DISTINCT p.module FROM role_permissions rp JOIN permissions p ON rp.permission_id=p.id WHERE rp.role_id=?`,[roleId]);
    const keys=perms.map(p=>p.module.toLowerCase().replace(/[\s/]+/g,'_'));
    res.json({success:true,data:MODULES_LIST.map(m=>({module_key:m.toLowerCase().replace(/[\s/]+/g,'_'),module_name:m,assigned:keys.includes(m.toLowerCase().replace(/[\s/]+/g,'_'))}))});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.updateRoleModules = async (req, res) => {
  res.json({success:true,message:"Role module access is managed via Role Permissions tab"});
};

/*  LOGIN LOGS  */
exports.getLoginLogsSummary = async (req, res) => {
  try {
    const [[{total}]]=await db.query(`SELECT COUNT(*) AS total FROM login_logs`);
    const [[{success_c}]]=await db.query(`SELECT COUNT(*) AS success_c FROM login_logs WHERE status='success'`);
    const [[{failed_c}]]=await db.query(`SELECT COUNT(*) AS failed_c FROM login_logs WHERE status='failed'`);
    const [[{today}]]=await db.query(`SELECT COUNT(*) AS today FROM login_logs WHERE DATE(created_at)=CURDATE()`);
    res.json({success:true,total,success_count:success_c,failed_count:failed_c,today});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getLoginLogs = async (req, res) => {
  try {
    const {search='',status='',page=1,limit=50}=req.query;
    const off=(Number(page)-1)*Number(limit);
    const where=['1=1'],p=[];
    if(search){where.push(`(ll.email LIKE ? OR ll.ip_address LIKE ?)`);p.push(`%${search}%`,`%${search}%`);}
    if(status){where.push(`ll.status=?`);p.push(status);}
    const [rows]=await db.query(`SELECT ll.*,u.name AS user_name FROM login_logs ll LEFT JOIN users u ON ll.user_id=u.id WHERE ${where.join(' AND ')} ORDER BY ll.created_at DESC LIMIT ? OFFSET ?`,[...p,Number(limit),off]);
    const [[{total}]]=await db.query(`SELECT COUNT(*) AS total FROM login_logs ll WHERE ${where.join(' AND ')}`,p);
    res.json({success:true,data:rows,total});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

/*  APPROVALS  */
exports.getApprovalsSummary = async (req, res) => {
  try {
    const [[{pending}]]=await db.query(`SELECT COUNT(*) AS pending FROM users WHERE status='inactive'`);
    const [[{blocked}]]=await db.query(`SELECT COUNT(*) AS blocked FROM users WHERE status='blocked'`);
    res.json({success:true,pending_approvals:pending,blocked_users:blocked});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.getApprovals = async (req, res) => {
  try {
    const {status='inactive'}=req.query;
    const [rows]=await db.query(`SELECT ${SAFE},r.display_name AS role_name FROM users u LEFT JOIN user_roles ur ON u.id=ur.user_id LEFT JOIN roles r ON ur.role_id=r.id WHERE u.status=? ORDER BY u.created_at DESC`,[status]);
    res.json({success:true,data:rows});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.approveUser = async (req, res) => {
  try {
    const {id}=req.params;
    const [[user]]=await db.query(`SELECT user_type FROM users WHERE id=?`,[id]);
    if(!user) return res.status(404).json({success:false,message:"User not found"});
    if(user.user_type==='super_admin') return res.status(403).json({success:false,message:"Cannot modify super admin"});
    await db.query(`UPDATE users SET status='active' WHERE id=?`,[id]);
    res.json({success:true,message:"User approved and activated"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};

exports.rejectUser = async (req, res) => {
  try {
    const {id}=req.params;
    const [[user]]=await db.query(`SELECT user_type FROM users WHERE id=?`,[id]);
    if(!user) return res.status(404).json({success:false,message:"User not found"});
    if(user.user_type==='super_admin') return res.status(403).json({success:false,message:"Cannot modify super admin"});
    await db.query(`UPDATE users SET status='blocked' WHERE id=?`,[id]);
    res.json({success:true,message:"User rejected and blocked"});
  } catch(e){res.status(500).json({success:false,message:e.message});}
};