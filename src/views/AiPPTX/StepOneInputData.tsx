// ** React Imports
import { Fragment, useState, useRef } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import {
  Description, // 输入主题与要求
  CloudUpload, // 导入外部资料
  TextFields, // 输入文本
  UploadFile, // 上传文件
  Link, // 输入网页地址
  List, // 导入大纲
  KeyboardArrowDown,
  KeyboardArrowRight,
  PlayCircleFilled, // 立即生成
} from "@mui/icons-material";

// ** Python Backend API
import { uploadFile, uploadUrl, checkPythonHealth } from 'src/api/pythonApi'


const StepOneInputData = ({ setActiveStep, setInputData }: any) => {
  // ** States

  // 状态管理
  const [selectedOption, setSelectedOption] = useState("inputTopic"); // 默认选中 "输入主题与要求"
  const [importOption, setImportOption] = useState("inputText"); // 默认选中 "输入文本"
  const [inputText, setInputText] = useState("2025年就业市场预测"); // 输入框内容
  const [showMoreOptions, setShowMoreOptions] = useState(false); // 是否显示更多生成要求
  const [moreOptions, setMoreOptions] = useState({ moreRequirement: "", language: "zh-CN", outlineLength: "regular" }); // 更多生成要求的内容

  // 文件上传状态
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedMarkdown, setUploadedMarkdown] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理选项切换
  const handleOptionChange = (option: any) => {
    setSelectedOption(option);
    // 切换时清除之前的状态
    setUploadError("");
    setUploadedMarkdown("");
  };

  // 处理导入选项切换
  const handleImportOptionChange = (option: any) => {
    setImportOption(option);
    setUploadError("");
  };

  // 处理更多生成要求的显示/隐藏
  const toggleMoreOptions = () => {
    setShowMoreOptions(!showMoreOptions);
  };

  /**
   * 生成项目唯一标识
   */
  const generateProjectId = () => {
    return 'ppt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['.pdf', '.docx', '.doc'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      setUploadError('仅支持 PDF 和 Word 文件');
      return;
    }

    // 验证文件大小（50MB）
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('文件大小不能超过 50MB');
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    setUploadedMarkdown("");

    try {
      const projectId = generateProjectId();
      const result = await uploadFile(file, projectId);

      if (result.success && result.markdown) {
        setUploadedMarkdown(result.markdown);
        setUploadedFileName(file.name);
        setInputText(result.markdown); // 将解析后的内容设置到输入文本
      } else {
        setUploadError('解析失败，请重试');
      }
    } catch (error: any) {
      setUploadError(error.message || '上传失败，请检查后端服务是否运行');
    } finally {
      setUploadLoading(false);
    }
  };

  /**
   * 处理 URL 解析
   */
  const handleUrlParse = async () => {
    if (!inputText.trim() || !inputText.startsWith('http')) {
      setUploadError('请输入有效的网页地址（以 http:// 或 https:// 开头）');
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    setUploadedMarkdown("");

    try {
      const projectId = generateProjectId();
      const result = await uploadUrl(inputText, projectId);

      if (result.success && result.markdown) {
        setUploadedMarkdown(result.markdown);
        setUploadedFileName(inputText);
        // 将解析后的内容追加到输入文本
        setInputText(result.markdown);
      } else {
        setUploadError('网页解析失败，请检查 URL 是否正确');
      }
    } catch (error: any) {
      setUploadError(error.message || '解析失败，请检查后端服务是否运行');
    } finally {
      setUploadLoading(false);
    }
  };

  // 处理立即生成按钮点击
  const handleGenerateOutline = () => {
    console.log("生成 PPTX 的参数：", {
      selectedOption,
      importOption,
      inputText,
      moreOptions,
    });
    setInputData((prevState: any) => ({...prevState, selectedOption, importOption, inputText, moreOptions}))
    setActiveStep((prevActiveStep: number) => prevActiveStep + 1)
  };

  return (
    <Box sx={{  }}>
      {/* 第一行：两个按钮 */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button
          variant={selectedOption === "inputTopic" ? "contained" : "outlined"}
          color={selectedOption === "inputTopic" ? "primary" : "inherit"}
          onClick={() => handleOptionChange("inputTopic")}
          startIcon={<Description />} // 输入主题与要求图标
        >
          输入主题与要求
        </Button>
        <Button
          variant={selectedOption === "importData" ? "contained" : "outlined"}
          color={selectedOption === "importData" ? "primary" : "inherit"}
          onClick={() => handleOptionChange("importData")}
          startIcon={<CloudUpload />} // 导入外部资料图标
        >
          导入外部资料（网络/文件等）
        </Button>
      </Box>

      {/* 第二行：根据选项显示不同内容 */}
      {selectedOption === "inputTopic" && (
        <TextField
          fullWidth
          label="请输入主题与要求"
          variant="outlined"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          sx={{ mt: 2, mb: 2 }}
        />
      )}

      {selectedOption === "importData" && (
        <>
          {/* 四个按钮 */}
          <Box sx={{ display: "flex", gap: 2, mb: 2, mt: 4 }}>
            <Button
              variant={importOption === "inputText" ? "contained" : "outlined"}
              color={importOption === "inputText" ? "primary" : "inherit"}
              onClick={() => handleImportOptionChange("inputText")}
              startIcon={<TextFields />}
            >
              输入文本
            </Button>
            <Button
              variant={importOption === "uploadFile" ? "contained" : "outlined"}
              color={importOption === "uploadFile" ? "primary" : "inherit"}
              onClick={() => handleImportOptionChange("uploadFile")}
              startIcon={<UploadFile />}
            >
              上传文件
            </Button>
            <Button
              variant={importOption === "inputUrl" ? "contained" : "outlined"}
              color={importOption === "inputUrl" ? "primary" : "inherit"}
              onClick={() => handleImportOptionChange("inputUrl")}
              startIcon={<Link />}
            >
              输入网页地址
            </Button>
            <Button
              variant={importOption === "importOutline" ? "contained" : "outlined"}
              color={importOption === "importOutline" ? "primary" : "inherit"}
              onClick={() => handleImportOptionChange("importOutline")}
              startIcon={<List />}
            >
              导入大纲
            </Button>
          </Box>

          {/* 动态显示输入框 */}
          {importOption === "inputText" && (
            <TextField
              fullWidth
              label="请输入文本"
              variant="outlined"
              multiline
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              sx={{ mb: 2, mt: 2 }}
            />
          )}

          {importOption === "uploadFile" && (
            <Box sx={{ mb: 2, mt: 2 }}>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                startIcon={<UploadFile />}
                sx={{ py: 2, borderStyle: 'dashed', borderWidth: 2 }}
              >
                {uploadLoading ? '正在上传解析...' : '点击选择文件（PDF / Word）'}
              </Button>

              {uploadLoading && <LinearProgress sx={{ mt: 1 }} />}
              {uploadError && <Alert severity="error" sx={{ mt: 1 }}>{uploadError}</Alert>}
              {uploadedFileName && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  已解析: {uploadedFileName}
                </Alert>
              )}
            </Box>
          )}

          {importOption === "inputUrl" && (
            <Box sx={{ mb: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="请输入网页地址"
                  variant="outlined"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="https://..."
                />
                <Button
                  variant="contained"
                  onClick={handleUrlParse}
                  disabled={uploadLoading}
                >
                  解析
                </Button>
              </Box>

              {uploadLoading && <LinearProgress sx={{ mt: 1 }} />}
              {uploadError && <Alert severity="error" sx={{ mt: 1 }}>{uploadError}</Alert>}
              {uploadedMarkdown && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  网页解析成功！
                </Alert>
              )}
            </Box>
          )}
        </>
      )}

      {/* 解析后的 Markdown 预览 */}
      {uploadedMarkdown && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 300, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            解析结果预览（前 1000 字符）：
          </Typography>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {uploadedMarkdown.length > 1000 ? uploadedMarkdown.substring(0, 1000) + '...' : uploadedMarkdown}
          </Typography>
        </Paper>
      )}

      {/* 更多生成要求 */}
      <Button
        variant="text"
        color="primary"
        onClick={toggleMoreOptions}
        sx={{ cursor: "pointer", mb: 2 }}
        endIcon={
          showMoreOptions ? (
            <KeyboardArrowRight sx={{ verticalAlign: "middle" }} />
          ) : (
            <KeyboardArrowDown sx={{ verticalAlign: "middle" }} />
          )
        }
      >
        更多生成要求
      </Button>

      {showMoreOptions && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size={"small"}
            label="请输入更多要求"
            variant="outlined"
            value={moreOptions.moreRequirement}
            onChange={(e) =>
              setMoreOptions({ ...moreOptions, moreRequirement: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          {/* 大纲篇幅选择 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body1">大纲篇幅:</Typography>
            <Select
              size={'small'}
              value={moreOptions.outlineLength}
              onChange={(e) =>
                setMoreOptions({ ...moreOptions, outlineLength: e.target.value })
              }
              displayEmpty
              sx={{my: 1}}
            >
              <MenuItem value="" disabled>
                请选择
              </MenuItem>
              <MenuItem value="short">较短 10-15 页</MenuItem>
              <MenuItem value="regular">常规 20-30 页</MenuItem>
              <MenuItem value="long">更长 25-35 页</MenuItem>
            </Select>
          </Box>
          {/* 下拉框和文本提示 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body1">选择语言:</Typography>
            <Select
              size={"small"}
              value={moreOptions.language}
              onChange={(e) =>
                setMoreOptions({ ...moreOptions, language: e.target.value })
              }
              displayEmpty
              sx={{my: 1}}
            >
              <MenuItem value="" disabled>
                请选择
              </MenuItem>
              <MenuItem value="zh-CN">中文</MenuItem>
              <MenuItem value="en">英文</MenuItem>
            </Select>
          </Box>
        </Box>
      )}

      <Grid container justifyContent="center">
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateOutline}
            startIcon={<PlayCircleFilled />}
          >
            立即生成
          </Button>
        </Grid>
      </Grid>

    </Box>
  )
}

export default StepOneInputData
