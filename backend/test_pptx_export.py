"""
PPTX 导出功能测试脚本
"""
import os
import sys
from pathlib import Path

# 添加 backend 到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.svg_to_pptx import convert_svgs_to_pptx, get_pptx_info

# 创建测试目录
test_dir = Path('temp/test_project/svg_output')
test_dir.mkdir(parents=True, exist_ok=True)

# 创建测试 SVG 文件
svg1 = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <rect width="1280" height="720" fill="#0B3D91"/>
  <text x="640" y="300" text-anchor="middle" fill="white" font-size="48" font-family="Microsoft YaHei">测试标题</text>
  <text x="640" y="380" text-anchor="middle" fill="#E0E0E0" font-size="24" font-family="Microsoft YaHei">副标题内容</text>
</svg>'''

svg2 = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <rect width="1280" height="720" fill="#1B5E20"/>
  <text x="80" y="80" fill="white" font-size="36" font-family="Microsoft YaHei">第一页内容</text>
  <text x="80" y="140" fill="#E0E0E0" font-size="18" font-family="Microsoft YaHei">要点 1</text>
  <text x="80" y="180" fill="#E0E0E0" font-size="18" font-family="Microsoft YaHei">要点 2</text>
</svg>'''

with open(test_dir / 'page_01.svg', 'w', encoding='utf-8') as f:
    f.write(svg1)
with open(test_dir / 'page_02.svg', 'w', encoding='utf-8') as f:
    f.write(svg2)

print('测试 SVG 文件创建成功')

# 测试导出
output_path = 'temp/test_project/test_output.pptx'
convert_svgs_to_pptx(str(test_dir), output_path, 'title: "测试演示文稿"')

# 验证
info = get_pptx_info(output_path)
print(f'PPTX 信息: {info}')

if info['pages'] > 0:
    print('测试通过！')
    sys.exit(0)
else:
    print('测试失败！')
    sys.exit(1)
