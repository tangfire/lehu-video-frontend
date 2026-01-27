import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SparkMD5 from 'spark-md5';
import { videoApi } from '../../api/video';
import { getCurrentUser } from '../../api/user';
import './Upload.css';

const Upload = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [videoHash, setVideoHash] = useState('');
    const [coverHash, setCoverHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [stepMessage, setStepMessage] = useState('');

    const videoInputRef = useRef(null);
    const coverInputRef = useRef(null);

    // 计算文件MD5 hash
    const calculateFileMD5 = (file) => {
        return new Promise((resolve, reject) => {
            const chunkSize = 2097152; // 每次读取2MB
            const chunks = Math.ceil(file.size / chunkSize);
            let currentChunk = 0;
            const spark = new SparkMD5.ArrayBuffer();
            const fileReader = new FileReader();

            fileReader.onload = function(e) {
                spark.append(e.target.result);
                currentChunk++;

                if (currentChunk < chunks) {
                    loadNext();
                } else {
                    const hash = spark.end();
                    console.log(`文件 ${file.name} 的MD5 hash:`, hash);
                    resolve(hash);
                }
            };

            fileReader.onerror = function() {
                reject(new Error('文件读取失败'));
            };

            function loadNext() {
                const start = currentChunk * chunkSize;
                const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
                fileReader.readAsArrayBuffer(file.slice(start, end));
            }

            loadNext();
        });
    };

    const handleVideoSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // 验证文件类型
            const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
            if (!validTypes.includes(file.type)) {
                setError('请选择有效的视频文件（MP4, WebM, OGG, MOV）');
                return;
            }

            // 验证文件大小（限制100MB）
            if (file.size > 100 * 1024 * 1024) {
                setError('视频文件不能超过100MB');
                return;
            }

            setVideoFile(file);
            setError(null);

            // 如果没有设置标题，使用文件名作为标题
            if (!title.trim()) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                setTitle(nameWithoutExt);
            }

            // 计算视频文件的MD5 hash
            setStepMessage('正在计算视频文件hash...');
            try {
                const hash = await calculateFileMD5(file);
                setVideoHash(hash);
                console.log('视频文件hash:', hash);
            } catch (error) {
                console.error('计算视频hash失败:', error);
                setError('计算视频文件hash失败');
            } finally {
                setStepMessage('');
            }
        }
    };

    const handleCoverSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // 验证文件类型
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setError('请选择有效的图片文件（JPG, PNG, GIF, WebP）');
                return;
            }

            // 验证文件大小（限制5MB）
            if (file.size > 5 * 1024 * 1024) {
                setError('封面图片不能超过5MB');
                return;
            }

            setCoverFile(file);
            setError(null);

            // 计算封面文件的MD5 hash
            setStepMessage('正在计算封面文件hash...');
            try {
                const hash = await calculateFileMD5(file);
                setCoverHash(hash);
                console.log('封面文件hash:', hash);
            } catch (error) {
                console.error('计算封面hash失败:', error);
                setError('计算封面文件hash失败');
            } finally {
                setStepMessage('');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!videoFile) {
            setError('请选择视频文件');
            return;
        }

        if (!title.trim()) {
            setError('请输入视频标题');
            return;
        }

        if (!videoHash) {
            setError('视频文件hash计算失败，请重新选择文件');
            return;
        }

        if (coverFile && !coverHash) {
            setError('封面文件hash计算失败，请重新选择文件');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        setProgress(0);
        setStepMessage('');

        try {
            const user = getCurrentUser();
            if (!user) {
                throw new Error('请先登录');
            }

            console.log('开始上传流程...');
            console.log('视频信息:', {
                file: videoFile.name,
                size: videoFile.size,
                type: videoFile.type,
                hash: videoHash
            });

            if (coverFile) {
                console.log('封面信息:', {
                    file: coverFile.name,
                    size: coverFile.size,
                    type: coverFile.type,
                    hash: coverHash
                });
            }

            // 1. 预注册上传视频
            setProgress(10);
            setStepMessage('正在准备上传视频...');

            const videoPreSignResp = await videoApi.preSign4UploadVideo({
                hash: videoHash,
                file_type: 'mp4',
                size: videoFile.size,
                filename: videoFile.name
            });

            console.log('视频预签名响应:', videoPreSignResp);

            if (!videoPreSignResp.url || !videoPreSignResp.file_id) {
                throw new Error('获取视频上传地址失败');
            }

            // 2. 上传视频到minio
            setProgress(30);
            setStepMessage('正在上传视频文件...');

            await uploadToMinio(videoPreSignResp.url, videoFile, videoHash);

            // 3. 报告视频上传完成，获取视频URL
            setProgress(50);
            setStepMessage('正在处理视频文件...');

            const videoFinishResp = await videoApi.reportFinishUpload(videoPreSignResp.file_id);
            console.log('视频完成响应:', videoFinishResp);

            if (!videoFinishResp.url) {
                throw new Error('获取视频访问地址失败');
            }

            let coverUrl = '';
            let coverFileId = 0;
            if (coverFile && coverHash) {
                try {
                    // 4. 预注册上传封面
                    setProgress(60);
                    setStepMessage('正在准备上传封面...');

                    const coverPreSignResp = await videoApi.preSign4UploadCover({
                        hash: coverHash,
                        file_type: 'png',
                        size: coverFile.size,
                        filename: coverFile.name
                    });

                    console.log('封面预签名响应:', coverPreSignResp);

                    if (!coverPreSignResp.url || !coverPreSignResp.file_id) {
                        throw new Error('获取封面上传地址失败');
                    }

                    coverFileId = coverPreSignResp.file_id;

                    // 5. 上传封面到minio
                    setProgress(70);
                    setStepMessage('正在上传封面图片...');

                    await uploadToMinio(coverPreSignResp.url, coverFile, coverHash);

                    // 6. 报告封面上传完成，获取封面URL
                    setProgress(80);
                    setStepMessage('正在处理封面图片...');

                    const coverFinishResp = await videoApi.reportFinishUpload(coverPreSignResp.file_id);
                    console.log('封面完成响应:', coverFinishResp);

                    if (coverFinishResp.url) {
                        coverUrl = coverFinishResp.url;
                    } else {
                        console.warn('获取封面访问地址失败，将继续上传视频');
                    }
                } catch (coverError) {
                    console.warn('封面上传失败，将继续上传视频:', coverError);
                    // 封面失败不影响视频上传
                }
            }

            // 7. 确认视频上传完成
            setProgress(90);
            setStepMessage('正在保存视频信息...');

            const videoData = {
                file_id: videoPreSignResp.file_id,
                title: title.trim(),
                description: description.trim(),
                video_url: videoFinishResp.url
            };

            // 如果有封面URL，添加到数据中
            if (coverUrl) {
                videoData.cover_url = coverUrl;
            }

            console.log('提交视频信息:', videoData);

            const videoFinalResp = await videoApi.reportVideoFinishUpload(videoData);

            console.log('视频最终响应:', videoFinalResp);

            if (!videoFinalResp.video_id) {
                throw new Error('视频保存失败');
            }

            setProgress(100);
            setStepMessage('');
            setSuccess(`视频上传成功！视频ID：${videoFinalResp.video_id}`);

            // 3秒后跳转到视频详情页
            setTimeout(() => {
                navigate(`/video/${videoFinalResp.video_id}`);
            }, 3000);

        } catch (error) {
            console.error('上传失败:', error);
            setError(`上传失败: ${error.message || '未知错误'}`);

            // 如果是hash验证失败，提示用户
            if (error.message && error.message.includes('hash')) {
                setError('文件hash验证失败，请确保文件未损坏并重新上传');
            }
        } finally {
            setLoading(false);
        }
    };

    const uploadToMinio = async (url, file, expectedHash) => {
        try {
            console.log('开始上传文件到minio:', {
                url,
                fileSize: file.size,
                fileName: file.name,
                expectedHash
            });

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
                body: file
            });

            console.log('minio上传响应:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                throw new Error(`minio上传失败: ${response.status} ${response.statusText}`);
            }

            console.log('minio上传成功');
            return response;
        } catch (error) {
            console.error('minio上传失败:', error);
            throw new Error(`文件上传失败: ${error.message}`);
        }
    };

    const triggerVideoInput = () => {
        videoInputRef.current?.click();
    };

    const triggerCoverInput = () => {
        coverInputRef.current?.click();
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setVideoFile(null);
        setCoverFile(null);
        setVideoHash('');
        setCoverHash('');
        setError(null);
        setSuccess(null);
        setStepMessage('');
        setProgress(0);
    };

    return (
        <div className="upload-container">
            <div className="upload-card">
                <h2 className="upload-title">上传视频</h2>

                {/* 进度条和步骤信息 */}
                {(progress > 0 || stepMessage) && (
                    <div className="progress-section">
                        {stepMessage && (
                            <p className="step-message">{stepMessage}</p>
                        )}
                        {progress > 0 && (
                            <div className="progress-container">
                                <div className="progress-bar" style={{ width: `${progress}%` }}>
                                    <span className="progress-text">{progress}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 错误提示 */}
                {error && (
                    <div className="error-message">
                        <p>{error}</p>
                    </div>
                )}

                {/* 成功提示 */}
                {success && (
                    <div className="success-message">
                        <p>{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="upload-form">
                    {/* 视频文件选择 */}
                    <div className="form-section">
                        <h3>1. 选择视频文件 *</h3>
                        <div
                            className={`file-dropzone ${videoFile ? 'has-file' : ''}`}
                            onClick={triggerVideoInput}
                        >
                            <input
                                type="file"
                                ref={videoInputRef}
                                onChange={handleVideoSelect}
                                accept="video/*"
                                style={{ display: 'none' }}
                                disabled={loading}
                            />
                            {videoFile ? (
                                <div className="file-info">
                                    <div className="file-icon">📹</div>
                                    <div className="file-details">
                                        <p className="file-name">{videoFile.name}</p>
                                        <p className="file-size">
                                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                        <p className="file-type">{videoFile.type}</p>
                                        {videoHash && (
                                            <p className="file-hash">
                                                <small>Hash: {videoHash.substring(0, 16)}...</small>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="file-prompt">
                                    <div className="upload-icon">📤</div>
                                    <p>点击选择视频文件</p>
                                    <p className="file-hint">支持 MP4, WebM, OGG, MOV，最大 100MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 封面选择 */}
                    <div className="form-section">
                        <h3>2. 选择封面图片（可选）</h3>
                        <div
                            className={`file-dropzone ${coverFile ? 'has-file' : ''}`}
                            onClick={triggerCoverInput}
                        >
                            <input
                                type="file"
                                ref={coverInputRef}
                                onChange={handleCoverSelect}
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={loading}
                            />
                            {coverFile ? (
                                <div className="file-info">
                                    <div className="file-icon">🖼️</div>
                                    <div className="file-details">
                                        <p className="file-name">{coverFile.name}</p>
                                        <p className="file-size">
                                            {(coverFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                        <p className="file-type">{coverFile.type}</p>
                                        {coverHash && (
                                            <p className="file-hash">
                                                <small>Hash: {coverHash.substring(0, 16)}...</small>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="file-prompt">
                                    <div className="upload-icon">🖼️</div>
                                    <p>点击选择封面图片</p>
                                    <p className="file-hint">支持 JPG, PNG, GIF, WebP，最大 5MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 视频信息 */}
                    <div className="form-section">
                        <h3>3. 填写视频信息</h3>

                        <div className="form-group">
                            <label htmlFor="title">视频标题 *</label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="请输入视频标题"
                                maxLength="100"
                                disabled={loading}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">视频描述</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="请输入视频描述（选填）"
                                rows="4"
                                maxLength="500"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={resetForm}
                            disabled={loading}
                        >
                            重置
                        </button>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading || !videoFile || !title.trim() || !videoHash}
                        >
                            {loading ? '上传中...' : '发布视频'}
                        </button>
                    </div>

                    {/* 上传提示 */}
                    <div className="upload-tips">
                        <h4>上传提示：</h4>
                        <ul>
                            <li>确保视频内容符合社区规范</li>
                            <li>视频封面建议比例为 16:9</li>
                            <li>上传过程中请不要关闭页面</li>
                            <li>网络状况会影响上传速度</li>
                            <li>文件上传前会计算MD5 hash确保完整性</li>
                            <li>封面文件可选，如不上传将使用默认封面</li>
                        </ul>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Upload;