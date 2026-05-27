import { useEffect, useState } from 'react';
import { campusAdminApi } from '../../api/admin';
import { toArrayFromLines } from './adminUtils';
import './Admin.css';

const initialForm = {
    category_code: 'guide',
    post_type: 'guide',
    media_type: 'text',
    title: '',
    content: '',
    images: '',
    cover_url: '',
    video_url: '',
    is_official: true,
    is_featured: true,
    is_pinned: true,
    sort_weight: 100,
};

const contentTemplates = [
    {
        name: '报到总攻略',
        category_code: 'guide',
        post_type: 'guide',
        title: '深汕校区新生报到前，先把这几件事确认好',
        content: '报到前建议先确认：录取通知书与身份证是否随身带好；学校官方报到时间和地点；班级群、辅导员通知和缴费状态；到校交通方式；宿舍入住要求。所有细节以学校最新通知为准，深汕e仔会持续整理公开信息。',
        sort_weight: 300,
    },
    {
        name: '宿舍 FAQ',
        category_code: 'life',
        post_type: 'guide',
        title: '宿舍入住 FAQ：哪些东西先别急着买？',
        content: '建议先带第一周一定会用的：证件、换洗衣物、洗漱用品、常用药、充电器、少量衣架。床帘、收纳架、台灯等尺寸相关物品，最好到校确认床位和宿舍规则后再买，避免买错规格。',
        sort_weight: 260,
    },
    {
        name: '交通路线',
        category_code: 'life',
        post_type: 'guide',
        title: '第一次去深汕校区，到校路线怎么规划？',
        content: '深汕校区位于深汕特别合作区，开学前建议优先关注学校招生网、学生处或辅导员发布的接站安排。自行到校的同学，提前确认高铁/大巴到站、转乘方式、报到入口和预计到达时间。',
        sort_weight: 240,
    },
    {
        name: '课表导入说明',
        category_code: 'study',
        post_type: 'guide',
        title: '课表导入怎么用？开学后看这一篇就够了',
        content: '进入底部“课表”，登录后输入学号和教务密码即可导入。密码只用于本次导入，不会在平台保存。后续如果学校开放正式接口，我们会切换成更安全的一键授权方式。',
        sort_weight: 220,
    },
    {
        name: '问答引导',
        category_code: 'qa',
        post_type: 'question',
        title: '新生有什么想提前问的？可以直接在评论区问',
        content: '关于报到、宿舍、交通、课表、校园网、生活用品、社团活动，都可以在这里提问。深汕e仔会优先整理大家问得最多的问题，后面发成攻略。',
        sort_weight: 180,
    },
];

const AdminCompose = () => {
    const [form, setForm] = useState(initialForm);
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        campusAdminApi.listCategories()
            .then((data) => setCategories(data.categories || []))
            .catch(() => setCategories([]));
    }, []);

    const update = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const applyTemplate = (template) => {
        setForm((prev) => ({
            ...prev,
            ...template,
            media_type: 'text',
            images: '',
            cover_url: '',
            video_url: '',
            is_official: true,
            is_featured: true,
            is_pinned: true,
        }));
        setMessage(`已填充模板：${template.name}`);
        setError('');
    };

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await campusAdminApi.createPost({
                category_code: form.category_code,
                post_type: form.post_type,
                media_type: form.media_type,
                title: form.title,
                content: form.content,
                images: toArrayFromLines(form.images),
                cover_url: form.cover_url,
                video_url: form.video_url,
                is_official: form.is_official,
                is_featured: form.is_featured,
                is_pinned: form.is_pinned,
                sort_weight: Number(form.sort_weight || 0),
            });
            setMessage('已发布到小程序首页');
            setForm(initialForm);
        } catch (err) {
            setError(err.message || '发布失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="admin-form" onSubmit={submit}>
            {message && <div className="admin-tag">{message}</div>}
            {error && <div className="admin-error">{error}</div>}
            <div className="admin-composer-grid">
                <section className="admin-panel">
                    <h2>运营种子内容</h2>
                    <div className="admin-template-row">
                        {contentTemplates.map((template) => (
                            <button className="admin-button" type="button" key={template.name} onClick={() => applyTemplate(template)}>
                                {template.name}
                            </button>
                        ))}
                    </div>
                    <div className="admin-form">
                        <div className="admin-field">
                            <label>标题</label>
                            <input className="admin-input" value={form.title} onChange={(e) => update('title', e.target.value)} maxLength={60} />
                        </div>
                        <div className="admin-field">
                            <label>正文</label>
                            <textarea className="admin-textarea" value={form.content} onChange={(e) => update('content', e.target.value)} maxLength={2000} />
                        </div>
                        <div className="admin-field">
                            <label>图片 URL，一行一个</label>
                            <textarea className="admin-textarea" value={form.images} onChange={(e) => update('images', e.target.value)} placeholder="图文笔记可填写 1-9 张图片地址" />
                        </div>
                        <div className="admin-field">
                            <label>封面 URL</label>
                            <input className="admin-input" value={form.cover_url} onChange={(e) => update('cover_url', e.target.value)} />
                        </div>
                        <div className="admin-field">
                            <label>视频 URL</label>
                            <input className="admin-input" value={form.video_url} onChange={(e) => update('video_url', e.target.value)} />
                        </div>
                    </div>
                </section>
                <section className="admin-panel">
                    <h2>发布设置</h2>
                    <div className="admin-form">
                        <div className="admin-field">
                            <label>版块</label>
                            <select className="admin-select" value={form.category_code} onChange={(e) => update('category_code', e.target.value)}>
                                {categories.length === 0 && <option value="guide">校园攻略</option>}
                                {categories.map((item) => (
                                    <option key={item.code} value={item.code}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>笔记类型</label>
                            <select className="admin-select" value={form.post_type} onChange={(e) => update('post_type', e.target.value)}>
                                <option value="guide">攻略</option>
                                <option value="question">问答</option>
                                <option value="lost">失物招领</option>
                                <option value="club">社团</option>
                                <option value="note">普通笔记</option>
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>媒体类型</label>
                            <select className="admin-select" value={form.media_type} onChange={(e) => update('media_type', e.target.value)}>
                                <option value="text">纯文字</option>
                                <option value="image">图文</option>
                                <option value="video">视频</option>
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>排序权重</label>
                            <input className="admin-input" type="number" value={form.sort_weight} onChange={(e) => update('sort_weight', e.target.value)} />
                        </div>
                        <div className="admin-checks">
                            <label>
                                <input type="checkbox" checked={form.is_official} onChange={(e) => update('is_official', e.target.checked)} />
                                官方标识
                            </label>
                            <label>
                                <input type="checkbox" checked={form.is_featured} onChange={(e) => update('is_featured', e.target.checked)} />
                                精选推荐
                            </label>
                            <label>
                                <input type="checkbox" checked={form.is_pinned} onChange={(e) => update('is_pinned', e.target.checked)} />
                                首页置顶
                            </label>
                        </div>
                        <button className="admin-button primary" disabled={loading}>{loading ? '发布中...' : '发布'}</button>
                    </div>
                </section>
            </div>
        </form>
    );
};

export default AdminCompose;
