import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiImage, FiPlus, FiSend, FiUploadCloud, FiVideo, FiX } from 'react-icons/fi';
import { campusAdminApi } from '../../api/admin';
import { excerpt, postTypeText, toArrayFromLines } from './adminUtils';
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
        badge: '开学必看',
        category_code: 'guide',
        post_type: 'guide',
        title: '深汕校区新生报到前，先把这几件事确认好',
        content: '报到前建议先确认：录取通知书与身份证是否随身带好；学校官方报到时间和地点；班级群、辅导员通知和缴费状态；到校交通方式；宿舍入住要求。所有细节以学校最新通知为准，深汕e仔会持续整理公开信息。',
        sort_weight: 300,
    },
    {
        name: '宿舍 FAQ',
        badge: '高收藏',
        category_code: 'life',
        post_type: 'guide',
        title: '宿舍入住 FAQ：哪些东西先别急着买？',
        content: '建议先带第一周一定会用的：证件、换洗衣物、洗漱用品、常用药、充电器、少量衣架。床帘、收纳架、台灯等尺寸相关物品，最好到校确认床位和宿舍规则后再买，避免买错规格。',
        sort_weight: 260,
    },
    {
        name: '交通路线',
        badge: '转发友好',
        category_code: 'life',
        post_type: 'guide',
        title: '第一次去深汕校区，到校路线怎么规划？',
        content: '深汕校区位于深汕特别合作区，开学前建议优先关注学校招生网、学生处或辅导员发布的接站安排。自行到校的同学，提前确认高铁/大巴到站、转乘方式、报到入口和预计到达时间。',
        sort_weight: 240,
    },
    {
        name: '课表导入说明',
        badge: '功能引导',
        category_code: 'study',
        post_type: 'guide',
        title: '课表导入怎么用？开学后看这一篇就够了',
        content: '进入底部“课表”，登录后输入学号和教务密码即可导入。密码只用于本次导入，不会在平台保存。后续如果学校开放正式接口，我们会切换成更安全的一键授权方式。',
        sort_weight: 220,
    },
    {
        name: '问答引导',
        badge: '拉互动',
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
    const [uploading, setUploading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        campusAdminApi.listCategories()
            .then((data) => setCategories(data.categories || []))
            .catch(() => setCategories([]));
    }, []);

    const images = useMemo(() => toArrayFromLines(form.images), [form.images]);
    const previewCover = form.cover_url || images[0] || '';

    const update = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateImages = (nextImages, nextCover = form.cover_url) => {
        setForm((prev) => ({
            ...prev,
            media_type: nextImages.length > 0 ? 'image' : (prev.media_type === 'image' ? 'text' : prev.media_type),
            images: nextImages.join('\n'),
            cover_url: nextCover || nextImages[0] || '',
        }));
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

    const uploadImages = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (files.length === 0) return;
        if (images.length + files.length > 9) {
            setError('图文笔记最多 9 张图片');
            return;
        }
        setUploading(true);
        setError('');
        setMessage('');
        try {
            const urls = [];
            for (const file of files) {
                const data = await campusAdminApi.uploadImage(file);
                if (data.url) urls.push(data.url);
            }
            updateImages([...images, ...urls]);
            setMessage(`已上传 ${urls.length} 张图片`);
        } catch (err) {
            setError(err.message || '图片上传失败');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (url) => {
        const nextImages = images.filter((item) => item !== url);
        updateImages(nextImages, form.cover_url === url ? nextImages[0] || '' : form.cover_url);
    };

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const nextImages = toArrayFromLines(form.images);
            const mediaType = form.media_type === 'text' && nextImages.length > 0 ? 'image' : form.media_type;
            await campusAdminApi.createPost({
                category_code: form.category_code,
                post_type: form.post_type,
                media_type: mediaType,
                title: form.title,
                content: form.content,
                images: nextImages,
                cover_url: form.cover_url || nextImages[0] || '',
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
        <form className="admin-compose-page" onSubmit={submit}>
            {message && <div className="admin-toast success">{message}</div>}
            {error && <div className="admin-error">{error}</div>}
            <div className="admin-composer-grid simple">
                <section className="admin-panel">
                    <div className="admin-panel-head">
                        <div>
                            <h2>发一篇深汕e仔官方帖</h2>
                            <p>先选模板，再改标题正文，配图后直接发布。</p>
                        </div>
                        <button className="admin-button primary" disabled={loading || uploading}>
                            <FiSend />
                            {loading ? '发布中...' : '发布'}
                        </button>
                    </div>

                    <div className="admin-step-title">1. 选一个模板</div>
                    <div className="admin-template-grid">
                        {contentTemplates.map((template) => (
                            <button className="admin-template-card" type="button" key={template.name} onClick={() => applyTemplate(template)}>
                                <span>{template.badge}</span>
                                <strong>{template.name}</strong>
                                <p>{excerpt(template.title, 28)}</p>
                            </button>
                        ))}
                    </div>

                    <div className="admin-step-title">2. 改成今天要发的内容</div>
                    <div className="admin-form simple-compose">
                        <div className="admin-field wide">
                            <label>标题</label>
                            <input className="admin-input" value={form.title} onChange={(e) => update('title', e.target.value)} maxLength={60} placeholder="建议 18-32 字，像小红书笔记标题一样直接有用" />
                        </div>
                        <div className="admin-field wide">
                            <label>正文</label>
                            <textarea className="admin-textarea tall" value={form.content} onChange={(e) => update('content', e.target.value)} maxLength={2000} placeholder="把最重要的信息放在前两行，方便首页卡片抓住新生注意力。" />
                        </div>
                    </div>

                    <div className="admin-upload-panel">
                        <div className="admin-upload-head">
                            <div>
                                <h3>3. 配图</h3>
                                <p>第一张会自动成为首页封面，没有图也可以发布文字笔记。</p>
                            </div>
                            <button className="admin-button" type="button" disabled={uploading || images.length >= 9} onClick={() => fileInputRef.current?.click()}>
                                <FiUploadCloud />
                                {uploading ? '上传中...' : '上传图片'}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={uploadImages} />
                        </div>
                        <div className="admin-upload-grid">
                            {images.map((url) => (
                                <div className="admin-upload-item" key={url}>
                                    <img src={url} alt="" />
                                    {form.cover_url === url && <span><FiCheck /> 封面</span>}
                                    <button type="button" onClick={() => removeImage(url)}><FiX /></button>
                                </div>
                            ))}
                            {images.length < 9 && (
                                <button className="admin-upload-add" type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                                    <FiPlus />
                                    添加图片
                                </button>
                            )}
                        </div>
                    </div>

                    <button className="admin-advanced-toggle" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        高级发布设置
                        <FiChevronDown className={showAdvanced ? 'rotate' : ''} />
                    </button>
                    {showAdvanced && (
                        <div className="admin-advanced-box">
                            <div className="admin-form two">
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
                                <div className="admin-field">
                                    <label>封面 URL</label>
                                    <input className="admin-input" value={form.cover_url} onChange={(e) => update('cover_url', e.target.value)} placeholder="为空时自动取第一张图片" />
                                </div>
                                <div className="admin-field">
                                    <label>视频 URL</label>
                                    <input className="admin-input" value={form.video_url} onChange={(e) => update('video_url', e.target.value)} placeholder="视频内容先填写 URL" />
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <aside className="admin-compose-aside">
                    <section className="admin-panel">
                        <h2>默认发布方式</h2>
                        <div className="admin-simple-switch-row">
                            <button className={form.is_official ? 'admin-pill active' : 'admin-pill'} type="button" onClick={() => update('is_official', !form.is_official)}>官方</button>
                            <button className={form.is_featured ? 'admin-pill active' : 'admin-pill'} type="button" onClick={() => update('is_featured', !form.is_featured)}>精选</button>
                            <button className={form.is_pinned ? 'admin-pill active' : 'admin-pill'} type="button" onClick={() => update('is_pinned', !form.is_pinned)}>置顶</button>
                        </div>
                        <p className="admin-muted">默认三项都开，适合开学前官方攻略。普通公告可以关掉置顶。</p>
                    </section>

                    <section className="admin-preview-panel">
                        <div className="admin-phone-preview">
                            <div className="admin-preview-cover">
                                {previewCover ? (
                                    <img src={previewCover} alt="" />
                                ) : form.media_type === 'video' ? (
                                    <div><FiVideo /> 视频封面</div>
                                ) : (
                                    <div><FiImage /> 文字笔记</div>
                                )}
                                {form.media_type === 'video' && <span className="admin-video-badge"><FiVideo /> 视频</span>}
                            </div>
                            <div className="admin-preview-body">
                                <h3>{form.title || '给新生看的实用标题'}</h3>
                                <p>{excerpt(form.content, 54) || '正文前两行会影响首页点击，建议直接写清楚能解决什么问题。'}</p>
                                <div className="admin-preview-author">
                                    <span>深汕e仔</span>
                                    {form.is_official && <em>官方</em>}
                                    {form.is_pinned && <em>置顶</em>}
                                    {form.is_featured && <em>精选</em>}
                                </div>
                                <div className="admin-muted">{postTypeText(form.post_type)} · 权重 {form.sort_weight || 0}</div>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </form>
    );
};

export default AdminCompose;
