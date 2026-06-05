// ** React Imports
import { useState, useEffect } from 'react';

// ** MUI Imports
import Typography from '@mui/material/Typography'; // Importing Typography
import toast from 'react-hot-toast';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import LinkIcon from '@mui/icons-material/Link';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import KeyIcon from '@mui/icons-material/Key';
import SaveIcon from '@mui/icons-material/Save';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { BackendApi } from './Config'
import { getLocalConfig, setLocalConfig, clearLocalConfig } from './LocalConfig'

const Setting = () => {
  // ** States

  // 状态管理
  const [aiApiUrl, setAiApiUrl] = useState(""); // 输入框内容
  const [aiModel, setAiModel] = useState(""); // 输入框内容
  const [aiToken, setAiToken] = useState(""); // 输入框内容
  const [hasLocalConfig, setHasLocalConfig] = useState(false); // 是否有本地临时配置

  // 处理保存到后端按钮点击
  const handleSaveConfig = async () => {
    try {
      const response = await fetch(BackendApi + 'saveConfig.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aiApiUrl, aiModel, aiToken })
      });

      const responseData = await response.json();

      if (responseData.status === 'ok') {
        toast.success(responseData.msg);
      } else {
        toast.error(responseData.msg);
      }
    } catch (error: any) {
      toast.error(error.message || '保存配置时发生错误');
    }
  };

  // 处理本地临时保存按钮点击
  // 将配置保存到浏览器 localStorage，不依赖后端
  // 适用于临时使用自己的 API key 而不保存到服务器
  const handleSaveLocalConfig = () => {
    if (!aiToken) {
      toast.error('请至少填写 AI Token');

      return;
    }

    try {
      setLocalConfig({
        apiUrl: aiApiUrl,
        apiModel: aiModel,
        apiToken: aiToken,
      });
      setHasLocalConfig(true);
      toast.success('本地临时配置已保存，刷新后仍可使用');
    } catch (error: any) {
      toast.error(error.message || '本地保存失败');
    }
  };

  // 处理清除本地配置按钮点击
  const handleClearLocalConfig = () => {
    clearLocalConfig();
    setHasLocalConfig(false);
    toast.success('本地临时配置已清除');
  };

  // On component mount:
  // 1. Try to load from localStorage first (local temp config)
  // 2. Fall back to fetching config from the backend
  useEffect(() => {
    const localConfig = getLocalConfig();

    if (localConfig) {
      // 优先使用本地配置
      setAiApiUrl(localConfig.apiUrl || "");
      setAiModel(localConfig.apiModel || "");
      setAiToken(localConfig.apiToken || "");
      setHasLocalConfig(true);
    }

    // 同时也尝试从后端获取配置
    const fetchConfig = async () => {
      try {
        const response = await fetch(BackendApi + 'saveConfig.php?action=getConfig');
        const data = await response.json();

        if (data.status === 'ok') {
          // 仅在没有本地配置时才使用后端配置填充
          if (!localConfig) {
            setAiApiUrl(data.API_URL || "");
            setAiModel(data.API_MODE || "");
          }
        }
      } catch (error) {
        // 静默处理后端连接错误
        // 不打扰用户 - 本地配置仍然可用
      }
    };

    fetchConfig();
  }, []);

  return (
    <Box sx={{ py: 5, px: 10 }}>
      {/* 本地配置状态提示 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        {hasLocalConfig ? (
          <Chip
            label="已启用本地临时配置（仅保存在当前浏览器）"
            color="success"
            size="small"
          />
        ) : (
          <Chip
            label="使用后端默认配置"
            color="default"
            size="small"
          />
        )}
      </Box>

      <TextField
        fullWidth
        label="AI API URL"
        variant="outlined"
        value={aiApiUrl}
        onChange={(e) => setAiApiUrl(e.target.value)}
        sx={{ mt: 2, mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LinkIcon />
            </InputAdornment>
          ),
        }}
        helperText="例如: https://api.deepseek.com 注意: 系统会自动在URL的后面追加: /chat/completions "
      />
      <TextField
        fullWidth
        label="AI Model"
        variant="outlined"
        value={aiModel}
        onChange={(e) => setAiModel(e.target.value)}
        sx={{ mt: 2, mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <ModelTrainingIcon />
            </InputAdornment>
          ),
        }}
        helperText="例如: deepseek-chat"
      />
      <TextField
        fullWidth
        label="AI Token"
        variant="outlined"
        value={aiToken}
        onChange={(e) => setAiToken(e.target.value)}
        sx={{ mt: 2, mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <KeyIcon />
            </InputAdornment>
          ),
        }}
        helperText="例如: sk-6deec2***********, 请输入你自己的KEY, 如果不需要KEY, 则输入一个任意值就可以."
      />
      <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>1 支持DeepSeek官方API</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>2 支持OpenAI官方以及第三方兼容API</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>3 "修改配置"保存到后端服务器（需要localhost访问）</Typography>
      <Typography variant="body2" sx={{ mb: 1, color: 'success.main' }}>4 "本地临时保存"存到浏览器，任何人部署后都可用自己的Key</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>5 为了安全期间, 不会显示系统已有Token的值</Typography>

      <Grid container justifyContent="center" sx={{ pt: 5, mt: 2, mb: 2, gap: 1 }}>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveConfig}
            startIcon={<SaveIcon />}
          >
            修改配置
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveLocalConfig}
            startIcon={<CloudDownloadIcon />}
          >
            本地临时保存
          </Button>
        </Grid>
        {hasLocalConfig && (
          <Grid item>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearLocalConfig}
              startIcon={<DeleteOutlineIcon />}
            >
              清除本地配置
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default Setting
