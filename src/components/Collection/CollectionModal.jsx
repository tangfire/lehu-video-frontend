
import { useState } from 'react';
import { FiX, FiFolderPlus } from 'react-icons/fi';
import './CollectionModal.css';

const CollectionModal = ({
                             isOpen,
                             onClose,
                             onSave,
                             title = '创建收藏夹',
                             initialData = { name: '', description: '' },
                             submitText = '创建'
                         }) => {
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        description: initialData.description || ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = '请输入收藏夹名称';
        } else if (formData.name.length > 50) {
            newErrors.name = '名称不能超过50个字符';
        }

        if (formData.description && formData.description.length > 200) {
            newErrors.description = '描述不能超过200个字符';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        try {
            await onSave(formData);
            handleClose();
        } catch (error) {
            setErrors({ submit: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ name: '', description: '' });
        setErrors({});
        onClose();
    };

    return (
        <div className="collection-modal-overlay" onClick={handleClose}>
            <div className="collection-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FiFolderPlus className="title-icon" />
                        <h3>{title}</h3>
                    </div>
                    <button className="close-btn" onClick={handleClose}>
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="name">收藏夹名称 *</label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="请输入收藏夹名称"
                            className={errors.name ? 'error' : ''}
                            maxLength={50}
                        />
                        {errors.name && <div className="error-message">{errors.name}</div>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">描述（可选）</label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="添加收藏夹描述..."
                            className={errors.description ? 'error' : ''}
                            maxLength={200}
                            rows={3}
                        />
                        {errors.description && <div className="error-message">{errors.description}</div>}
                        <div className="char-count">{formData.description.length}/200</div>
                    </div>

                    {errors.submit && (
                        <div className="form-error">{errors.submit}</div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={handleClose}>
                            取消
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? '处理中...' : submitText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CollectionModal;
