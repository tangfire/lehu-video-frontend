import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiShield } from 'react-icons/fi';
import { campusAdminApi } from '../../api/admin';
import './Admin.css';

const auditModes = [
    {
        value: 'off',
        title: '不审核',
        desc: '同学发帖后直接展示。适合内测冷启动，内容风险靠举报和运营巡查兜底。',
    },
    {
        value: 'manual',
        title: '人工审核',
        desc: '同学发帖后进入待审核，运营通过后才展示。适合正式推广前后。',
    },
    {
        value: 'ai',
        title: 'AI 审核',
        desc: '低风险内容自动通过，疑似违规保留待审核给运营复核。',
    },
];

const AdminAuditSettings = () => {
    const [settings, setSettings] = useState(null);
    const [selectedMode, setSelectedMode] = useState('off');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmMode, setConfirmMode] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await campusAdminApi.getAuditSettings();
            const next = data.settings || {};
            setSettings(next);
            setSelectedMode(next.post_audit_mode || 'off');
        } catch (err) {
            setError(err.message || '获取审核设置失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const currentMode = settings?.post_audit_mode || 'off';
    const changed = selectedMode !== currentMode;
    const selected = useMemo(() => auditModes.find((item) => item.value === selectedMode) || auditModes[0], [selectedMode]);

    const save = async () => {
        if (!changed || saving) return;
        if (selectedMode !== 'off' && !confirmMode) {
            setConfirmMode(selectedMode);
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const data = await campusAdminApi.updateAuditSettings({ post_audit_mode: selectedMode });
            const next = data.settings || {};
            setSettings(next);
            setSelectedMode(next.post_audit_mode || selectedMode);
            setConfirmMode('');
            setMessage('审核设置已保存');
            window.setTimeout(() => setMessage(''), 2400);
        } catch (err) {
            setError(err.message || '保存审核设置失败');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-audit-settings-page">
            {message && <div className="admin-toast success">{message}</div>}
            {error && <div className="admin-error">{error}</div>}

            <section className="admin-simple-head compact">
                <div>
                    <span className="admin-kicker">CONTENT AUDIT</span>
                    <h2>发帖审核设置</h2>
                    <p>内测可以先不审核；用户量变大后，再切到人工审核或 AI 审核。</p>
                </div>
                <button className="admin-button" type="button" disabled={loading} onClick={load}>
                    <FiRefreshCw className={loading ? 'spin' : ''} />
                    刷新
                </button>
            </section>

            <section className="admin-audit-mode-grid">
                {auditModes.map((mode) => (
                    <button
                        className={`admin-audit-mode-card ${selectedMode === mode.value ? 'active' : ''}`}
                        type="button"
                        key={mode.value}
                        onClick={() => setSelectedMode(mode.value)}
                    >
                        <span>{selectedMode === mode.value ? <FiCheckCircle /> : <FiShield />}</span>
                        <strong>{mode.title}</strong>
                        <p>{mode.desc}</p>
                    </button>
                ))}
            </section>

            <section className="admin-panel admin-audit-current">
                <div>
                    <h2>当前选择：{selected.title}</h2>
                    <p>{selected.desc}</p>
                    <span>
                        当前生效：{auditModes.find((item) => item.value === currentMode)?.title || '不审核'}
                        {settings?.ai_enabled ? ' · AI 可用' : ' · AI 未配置'}
                        {settings?.updated_at ? ` · 更新时间 ${settings.updated_at}` : ''}
                    </span>
                </div>
                <button className="admin-button primary" type="button" disabled={!changed || saving} onClick={save}>
                    {saving ? '保存中...' : '保存设置'}
                </button>
            </section>

            {selectedMode === 'ai' && !settings?.ai_enabled && (
                <div className="admin-audit-warning">
                    <FiAlertTriangle />
                    <span>当前后端未配置 AI 审核 Key。切到 AI 审核后，新帖会进入待审核并等待人工复核。</span>
                </div>
            )}

            {confirmMode && (
                <div className="admin-modal-backdrop" role="presentation">
                    <div className="admin-confirm-modal">
                        <div className="admin-modal-icon danger"><FiAlertTriangle /></div>
                        <h3>确认切换审核模式？</h3>
                        <p>切换到「{auditModes.find((item) => item.value === confirmMode)?.title}」后，普通用户新发帖子将不再直接进入首页展示。</p>
                        <div className="admin-modal-actions">
                            <button className="admin-button" disabled={saving} onClick={() => setConfirmMode('')}>取消</button>
                            <button className="admin-button danger" disabled={saving} onClick={save}>确认切换</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAuditSettings;
