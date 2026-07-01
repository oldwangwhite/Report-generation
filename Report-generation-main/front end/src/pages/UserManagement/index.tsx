import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Input, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
    listRolePermissions,
    listUsers,
    updateRolePermissions,
    updateUserRole,
    updateUserStatus,
} from '../../services/reportService';
import type { ManagedUser, RolePermissionItem, RolePermissionsResult } from '../../types/report';
import { formatDateTimeMinute } from '../../utils/datetime';
import '../ReportManagement/style.css';

const { Title, Text, Paragraph } = Typography;

const roleLabels: Record<ManagedUser['role'], string> = {
    user: '普通用户',
    admin: '管理员',
    super_admin: '超级管理员',
};

/** 超级管理员用户与角色权限管理页面。 */
export default function UserManagementPage() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [keyword, setKeyword] = useState('');
    const [role, setRole] = useState<string>();
    const [status, setStatus] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [permissionLoading, setPermissionLoading] = useState(false);
    const [actioning, setActioning] = useState('');
    const [permissionData, setPermissionData] = useState<RolePermissionsResult | null>(null);

    const permissionOptions = useMemo(
        () =>
            (permissionData?.availablePermissions || []).map((item) => ({
                label: `${item.name}（${item.code}）`,
                value: item.code,
            })),
        [permissionData],
    );

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await listUsers({ page: 1, size: 50, keyword, role, status });
            setUsers(data.items);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '用户列表加载失败');
        } finally {
            setLoading(false);
        }
    };

    const loadPermissions = async () => {
        setPermissionLoading(true);
        try {
            const data = await listRolePermissions();
            setPermissionData(data);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '角色权限加载失败');
        } finally {
            setPermissionLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
        loadPermissions();
    }, []);

    const handleRoleChange = async (record: ManagedUser, nextRole: ManagedUser['role']) => {
        setActioning(record.userId);
        try {
            const updated = await updateUserRole(record.userId, nextRole);
            setUsers((prev) => prev.map((item) => (item.userId === record.userId ? updated : item)));
            message.success('用户角色已更新');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '角色更新失败');
        } finally {
            setActioning('');
        }
    };

    const handleStatusChange = async (record: ManagedUser, checked: boolean) => {
        setActioning(record.userId);
        try {
            const updated = await updateUserStatus(record.userId, checked ? 'enabled' : 'disabled');
            setUsers((prev) => prev.map((item) => (item.userId === record.userId ? updated : item)));
            message.success('用户状态已更新');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '状态更新失败');
        } finally {
            setActioning('');
        }
    };

    const handlePermissionDraftChange = (roleItem: RolePermissionItem, permissionCodes: string[]) => {
        setPermissionData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                roles: prev.roles.map((item) =>
                    item.role === roleItem.role ? { ...item, permissionCodes } : item,
                ),
            };
        });
    };

    const handlePermissionSave = async (roleItem: RolePermissionItem) => {
        setActioning(`permission-${roleItem.role}`);
        try {
            const data = await updateRolePermissions(roleItem.role, roleItem.permissionCodes);
            setPermissionData(data);
            message.success('角色权限已保存');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '角色权限保存失败');
        } finally {
            setActioning('');
        }
    };

    const columns: ColumnsType<ManagedUser> = [
        { title: '用户 ID', dataIndex: 'userId', width: 120 },
        { title: '账号', dataIndex: 'username' },
        { title: '显示名称', dataIndex: 'displayName' },
        {
            title: '角色',
            dataIndex: 'role',
            width: 190,
            render: (_, record) => (
                <Select<ManagedUser['role']>
                    value={record.role}
                    style={{ width: 150 }}
                    loading={actioning === record.userId}
                    onChange={(value) => handleRoleChange(record, value)}
                    options={[
                        { label: '普通用户', value: 'user' },
                        { label: '管理员', value: 'admin' },
                        { label: '超级管理员', value: 'super_admin' },
                    ]}
                />
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Switch
                        checked={record.status === 'enabled'}
                        loading={actioning === record.userId}
                        checkedChildren="启用"
                        unCheckedChildren="停用"
                        onChange={(checked) => handleStatusChange(record, checked)}
                    />
                    <Tag color={record.status === 'enabled' ? 'success' : 'default'}>
                        {record.status === 'enabled' ? '启用' : '停用'}
                    </Tag>
                </Space>
            ),
        },
        { title: '创建时间', dataIndex: 'createdAt', width: 150, render: (value?: string) => formatDateTimeMinute(value) },
    ];

    return (
        <main className="management-page">
            <section className="management-hero">
                <div>
                    <Text type="secondary">超级管理员 / 用户与角色权限</Text>
                    <Title level={2}>用户账户、角色与 RBAC 权限</Title>
                    <Paragraph>管理用户账号、用户角色、启停状态，并维护报告生成模块的角色权限组合。</Paragraph>
                </div>
                <Button icon={<ReloadOutlined />} loading={loading || permissionLoading} onClick={() => { loadUsers(); loadPermissions(); }}>
                    刷新
                </Button>
            </section>

            <Tabs
                items={[
                    {
                        key: 'users',
                        label: '用户账户',
                        children: (
                            <Card>
                                <Space style={{ marginBottom: 16 }} wrap>
                                    <Input.Search
                                        allowClear
                                        placeholder="搜索账号"
                                        value={keyword}
                                        onChange={(event) => setKeyword(event.target.value)}
                                        onSearch={loadUsers}
                                        style={{ width: 220 }}
                                    />
                                    <Select
                                        allowClear
                                        placeholder="角色"
                                        value={role}
                                        style={{ width: 150 }}
                                        onChange={setRole}
                                        options={[
                                            { label: '普通用户', value: 'user' },
                                            { label: '管理员', value: 'admin' },
                                            { label: '超级管理员', value: 'super_admin' },
                                        ]}
                                    />
                                    <Select
                                        allowClear
                                        placeholder="状态"
                                        value={status}
                                        style={{ width: 130 }}
                                        onChange={setStatus}
                                        options={[
                                            { label: '启用', value: 'enabled' },
                                            { label: '停用', value: 'disabled' },
                                        ]}
                                    />
                                    <Button type="primary" onClick={loadUsers}>
                                        查询
                                    </Button>
                                </Space>
                                <Table rowKey="userId" columns={columns} dataSource={users} loading={loading} pagination={{ pageSize: 10 }} />
                            </Card>
                        ),
                    },
                    {
                        key: 'permissions',
                        label: '角色权限',
                        children: (
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                {(permissionData?.roles || []).map((roleItem) => (
                                    <Card
                                        key={roleItem.role}
                                        title={roleLabels[roleItem.role] || roleItem.roleName}
                                        extra={
                                            <Button
                                                icon={<SaveOutlined />}
                                                type="primary"
                                                disabled={roleItem.role === 'super_admin'}
                                                loading={actioning === `permission-${roleItem.role}`}
                                                onClick={() => handlePermissionSave(roleItem)}
                                            >
                                                保存权限
                                            </Button>
                                        }
                                    >
                                        <Checkbox.Group
                                            options={permissionOptions}
                                            value={roleItem.permissionCodes}
                                            disabled={roleItem.role === 'super_admin'}
                                            onChange={(values) => handlePermissionDraftChange(roleItem, values as string[])}
                                        />
                                        {roleItem.role === 'super_admin' && (
                                            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                                                超级管理员默认拥有全部权限，不支持收回。
                                            </Paragraph>
                                        )}
                                    </Card>
                                ))}
                            </Space>
                        ),
                    },
                ]}
            />
        </main>
    );
}
