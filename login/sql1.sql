-- ============================================================
-- 电力行业知识管理系统 - 数据库建表语句（含手机号字段）
-- 更新说明：在users表中添加phone字段，支持手机号登录
-- ============================================================

CREATE DATABASE IF NOT EXISTS power_knowledge_management 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE power_knowledge_management;

-- ============================================================
-- 1. 用户与权限模块 (RBAC)
-- ============================================================

-- 角色表
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
    name            VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码：standard_user/admin/super_admin',
    display_name    VARCHAR(100) NOT NULL COMMENT '角色显示名称',
    description     VARCHAR(255) COMMENT '角色描述',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 权限表
CREATE TABLE permissions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '权限ID',
    code            VARCHAR(50) NOT NULL UNIQUE COMMENT '权限编码',
    name            VARCHAR(100) NOT NULL COMMENT '权限名称',
    description     VARCHAR(255) COMMENT '权限描述',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 角色权限关联表
CREATE TABLE role_permissions (
    role_id         BIGINT NOT NULL COMMENT '角色ID',
    permission_id   BIGINT NOT NULL COMMENT '权限ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ============================================================
-- 用户表（含手机号字段）
-- ============================================================
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username        VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash   VARCHAR(255) NOT NULL COMMENT '密码哈希(BCrypt)',
    -- 新增：手机号字段
    phone           VARCHAR(20) UNIQUE COMMENT '手机号，用于手机号登录',
    phone_verified  BOOLEAN DEFAULT FALSE COMMENT '手机号是否已验证',
    -- 基础信息
    display_name    VARCHAR(100) COMMENT '显示名称',
    avatar_url      VARCHAR(500) COMMENT '头像URL',
    -- 角色与状态
    role_id         BIGINT NOT NULL COMMENT '角色ID',
    is_active       BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    -- 登录信息
    last_login_at   DATETIME COMMENT '最后登录时间',
    last_login_ip   VARCHAR(50) COMMENT '最后登录IP',
    login_count     INT DEFAULT 0 COMMENT '登录次数',
    -- 时间戳
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    -- 索引
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_username (username),
    INDEX idx_phone (phone),              -- 手机号索引，加速登录查询
    INDEX idx_role_id (role_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表（支持手机号登录）';

-- ============================================================
-- 初始化数据
-- ============================================================
INSERT INTO roles (name, display_name, description) VALUES
('standard_user', '标准用户', '普通用户，可使用知识检索和问答功能'),
('admin', '管理员', '可管理知识库、文档、素材和系统配置'),
('super_admin', '超级管理员', '拥有最高系统管理权限');

INSERT INTO permissions (code, name, description) VALUES
('knowledge_qa', '知识问答', '使用知识问答功能'),
('data_analysis', '数据分析', '使用数据分析功能'),
('report_gen', '报告生成', '使用报告生成功能'),
('kb_manage', '知识库管理', '创建、编辑、删除知识库'),
('doc_manage', '文档管理', '上传、删除文档'),
('material_manage', '素材管理', '上传、管理素材'),
('system_config', '系统配置', '修改系统配置'),
('user_manage', '用户管理', '管理系统用户');

-- 角色权限分配
INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 1), (1, 2), (1, 3);

INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6);

INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8);

-- 初始化管理员账号（密码为明文 'admin123'，生产环境请使用bcrypt哈希）
INSERT INTO users (username, password_hash, phone, phone_verified, display_name, role_id, is_active) VALUES
('admin', 'admin123', '13800138000', TRUE, '系统管理员', 3, TRUE);

-- ============================================================
-- 2. 知识库管理模块
-- ============================================================
DROP TABLE IF EXISTS knowledge_bases;

CREATE TABLE knowledge_bases (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '知识库ID',
    name            VARCHAR(200) NOT NULL COMMENT '知识库名称',
    description     TEXT COMMENT '知识库描述',
    type            VARCHAR(50) NOT NULL COMMENT '文档类型：regulation/tech_report/term_entry/general',
    type_name       VARCHAR(50) COMMENT '类型显示名称',
    segment_strategy JSON NOT NULL COMMENT '分段策略配置',
    search_strategy JSON NOT NULL COMMENT '检索策略配置',
    doc_count       INT DEFAULT 0 COMMENT '文档数量',
    chunk_count     INT DEFAULT 0 COMMENT '切片数量',
    created_by      BIGINT NOT NULL COMMENT '创建人ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_type (type),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库表';

-- ============================================================
-- 3. 文档管理模块
-- ============================================================
DROP TABLE IF EXISTS document_tags;
DROP TABLE IF EXISTS doc_status_logs;
DROP TABLE IF EXISTS chunks;
DROP TABLE IF EXISTS documents;

CREATE TABLE documents (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '文档ID',
    kb_id           BIGINT NOT NULL COMMENT '所属知识库ID',
    filename        VARCHAR(500) NOT NULL COMMENT '原始文件名',
    file_path       VARCHAR(1000) NOT NULL COMMENT '存储路径',
    file_size       BIGINT COMMENT '文件大小（字节）',
    file_type       VARCHAR(20) COMMENT '文件类型',
    status          VARCHAR(20) NOT NULL DEFAULT 'uploaded' COMMENT '状态',
    status_msg      TEXT COMMENT '状态说明/失败原因',
    chunk_count     INT DEFAULT 0 COMMENT '切片数量',
    parsed_content  LONGTEXT COMMENT '解析后的文本内容',
    tags            JSON COMMENT '标签数组',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    INDEX idx_kb_status (kb_id, status),
    INDEX idx_status (status),
    INDEX idx_file_type (file_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档表';

CREATE TABLE document_tags (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '标签关联ID',
    doc_id          BIGINT NOT NULL COMMENT '文档ID',
    tag_name        VARCHAR(100) NOT NULL COMMENT '标签名称',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE KEY uk_doc_tag (doc_id, tag_name),
    INDEX idx_tag_name (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签关联表';

CREATE TABLE doc_status_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    doc_id          BIGINT NOT NULL COMMENT '文档ID',
    from_status     VARCHAR(20) COMMENT '原状态',
    to_status       VARCHAR(20) NOT NULL COMMENT '目标状态',
    message         TEXT COMMENT '状态说明',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE,
    INDEX idx_doc_id (doc_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档处理状态日志表';

CREATE TABLE chunks (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '切片ID',
    doc_id          BIGINT NOT NULL COMMENT '所属文档ID',
    kb_id           BIGINT NOT NULL COMMENT '所属知识库ID',
    content         TEXT NOT NULL COMMENT '切片文本内容',
    content_length  INT COMMENT '内容字符数',
    chunk_index     INT NOT NULL COMMENT '文档内切片序号',
    heading_path    VARCHAR(500) COMMENT '章节路径',
    heading_level   INT COMMENT '标题层级',
    page_number     INT COMMENT '页码',
    vector_id       VARCHAR(100) COMMENT '向量数据库中的ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    INDEX idx_doc_id (doc_id),
    INDEX idx_kb_id (kb_id),
    INDEX idx_chunk_index (doc_id, chunk_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档切片表';

-- ============================================================
-- 4. 素材管理模块
-- ============================================================
DROP TABLE IF EXISTS material_tags;
DROP TABLE IF EXISTS materials;

CREATE TABLE materials (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '素材ID',
    name            VARCHAR(500) NOT NULL COMMENT '素材名称',
    type            VARCHAR(50) NOT NULL COMMENT '素材类型',
    file_path       VARCHAR(1000) NOT NULL COMMENT '文件路径',
    file_size       BIGINT COMMENT '文件大小',
    file_type       VARCHAR(20) COMMENT '文件类型',
    description     TEXT COMMENT '素材描述',
    created_by      BIGINT NOT NULL COMMENT '上传人ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_type (type),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材表';

CREATE TABLE material_tags (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '标签关联ID',
    material_id     BIGINT NOT NULL COMMENT '素材ID',
    tag_key         VARCHAR(100) NOT NULL COMMENT '标签键',
    tag_value       VARCHAR(200) NOT NULL COMMENT '标签值',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    UNIQUE KEY uk_mat_tag (material_id, tag_key, tag_value),
    INDEX idx_tag_key_value (tag_key, tag_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材标签表';

-- ============================================================
-- 5. 系统配置模块
-- ============================================================
DROP TABLE IF EXISTS system_configs;

CREATE TABLE system_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
    config_type     VARCHAR(50) NOT NULL UNIQUE COMMENT '配置类型',
    config_name     VARCHAR(100) NOT NULL COMMENT '配置名称',
    config_data     JSON NOT NULL COMMENT '配置内容',
    description     TEXT COMMENT '配置说明',
    is_active       BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    updated_by      BIGINT COMMENT '最后更新人ID',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX idx_config_type (config_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

INSERT INTO system_configs (config_type, config_name, config_data, description) VALUES
('embedding_model', '嵌入模型', 
 '{"name":"BAAI/bge-m3","api_url":"https://api.siliconflow.cn/v1/embeddings","vector_dim":0,"api_key":"","timeout":30}',
 '嵌入模型配置'),
('rerank_model', '重排序模型',
 '{"name":"BAAI/bge-reranker-v2-m3","api_url":"https://api.siliconflow.cn/v1/rerank","top_n":5,"api_key":"","timeout":30}',
 '重排序模型配置'),
('llm', '大语言模型',
 '{"api_url":"","api_key":"","model_name":"","timeout":30,"max_tokens":4096,"temperature":0.7}',
 '大语言模型配置'),
('doc_parser', '文档解析器',
 '{"max_concurrent":4,"backend":"default"}',
 '文档解析器配置'),
('qa_settings', '知识问答设置',
 '{"term_kb_id":1,"tech_kb_id":2,"top_k":10,"similarity_threshold":0.7,"rerank_top_n":5}',
 '知识问答默认配置');

-- ============================================================
-- 6. 数据统计与监控模块
-- ============================================================
DROP TABLE IF EXISTS daily_stats;
DROP TABLE IF EXISTS operation_logs;

CREATE TABLE operation_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    user_id         BIGINT COMMENT '操作用户ID',
    operation_type  VARCHAR(50) NOT NULL COMMENT '操作类型',
    kb_id           BIGINT COMMENT '关联知识库ID',
    doc_id          BIGINT COMMENT '关联文档ID',
    detail          JSON COMMENT '操作详情',
    ip_address      VARCHAR(50) COMMENT '操作IP地址',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_user_id (user_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_kb_id (kb_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

CREATE TABLE daily_stats (
    stat_date       DATE NOT NULL COMMENT '统计日期',
    doc_upload_count INT DEFAULT 0 COMMENT '文档上传数',
    qa_chat_count   INT DEFAULT 0 COMMENT '知识问答次数',
    report_gen_count INT DEFAULT 0 COMMENT '报告生成次数',
    kb_search_count INT DEFAULT 0 COMMENT '知识检索次数',
    kb_create_count INT DEFAULT 0 COMMENT '知识库创建数',
    active_user_count INT DEFAULT 0 COMMENT '活跃用户数',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    PRIMARY KEY (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日统计汇总表';

-- ============================================================
-- 7. 触发器
-- ============================================================
DELIMITER //

CREATE TRIGGER tr_kb_strategy_update
AFTER UPDATE ON knowledge_bases
FOR EACH ROW
BEGIN
    IF OLD.segment_strategy != NEW.segment_strategy 
       OR OLD.search_strategy != NEW.search_strategy THEN
        UPDATE documents 
        SET status = 'uploaded',
            status_msg = '知识库策略变更，触发重新处理',
            chunk_count = 0
        WHERE kb_id = NEW.id 
          AND status = 'ready';
    END IF;
END//

CREATE TRIGGER tr_doc_status_change
AFTER UPDATE ON documents
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO doc_status_logs (doc_id, from_status, to_status, message)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.status_msg);
    END IF;
END//

CREATE TRIGGER tr_doc_delete_cleanup
BEFORE DELETE ON documents
FOR EACH ROW
BEGIN
    INSERT INTO doc_status_logs (doc_id, from_status, to_status, message)
    VALUES (OLD.id, OLD.status, 'deleted', '文档被删除');
END//

CREATE TRIGGER tr_kb_doc_count_update
AFTER INSERT ON documents
FOR EACH ROW
BEGIN
    UPDATE knowledge_bases SET doc_count = doc_count + 1 WHERE id = NEW.kb_id;
END//

CREATE TRIGGER tr_kb_doc_count_delete
AFTER DELETE ON documents
FOR EACH ROW
BEGIN
    UPDATE knowledge_bases SET doc_count = doc_count - 1 WHERE id = OLD.kb_id;
END//

DELIMITER ;

-- ============================================================
-- 8. 视图
-- ============================================================
CREATE OR REPLACE VIEW v_knowledge_bases_detail AS
SELECT 
    kb.id, kb.name, kb.description, kb.type, kb.type_name,
    kb.segment_strategy, kb.search_strategy, kb.doc_count, kb.chunk_count,
    kb.created_by, u.username as created_by_name, u.phone as created_by_phone,
    kb.created_at, kb.updated_at
FROM knowledge_bases kb
LEFT JOIN users u ON kb.created_by = u.id;

CREATE OR REPLACE VIEW v_users_detail AS
SELECT 
    u.id, u.username, u.phone, u.phone_verified, u.display_name, u.avatar_url,
    u.role_id, r.name as role_name, r.display_name as role_display_name,
    u.is_active, u.last_login_at, u.last_login_ip, u.login_count,
    u.created_at, u.updated_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;

SELECT '数据库初始化完成（含手机号字段）' AS message;


ALTER TABLE users ADD COLUMN password_salt VARCHAR(64) COMMENT '密码盐值';
ALTER TABLE users ADD COLUMN login_fail_count INT DEFAULT 0 COMMENT '连续登录失败次数';
ALTER TABLE users ADD COLUMN locked_until DATETIME COMMENT '账户锁定截止时间';
ALTER TABLE users ADD COLUMN password_changed_at DATETIME COMMENT '最后修改密码时间';
ALTER TABLE users ADD COLUMN require_password_change BOOLEAN DEFAULT FALSE COMMENT '是否强制要求修改密码';



ALTER TABLE users ADD COLUMN email VARCHAR(128) UNIQUE COMMENT '邮箱地址';
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE COMMENT '邮箱是否已验证';


select * from users;