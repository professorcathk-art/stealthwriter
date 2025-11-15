# 数字加法计算器

一个使用 Next.js 和 DeepSeek LLM 的数字加法计算器，支持中文、英文和阿拉伯数字输入。

## 功能特性

- 支持多种数字格式输入（中文、英文、阿拉伯数字）
- 使用 DeepSeek LLM 进行数字加法计算
- 现代化的用户界面
- 实时结果显示

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
创建 `.env.local` 文件并添加您的 DeepSeek API Key：
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

您可以在 [DeepSeek Platform](https://platform.deepseek.com) 获取 API Key。

3. 运行开发服务器：
```bash
npm run dev
```

4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## 使用说明

1. 在第一个输入框中输入第一个数字（支持中文、英文、阿拉伯数字）
2. 在第二个输入框中输入第二个数字
3. 点击中间的加号按钮进行计算
4. 结果会显示在下方的结果区域

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- DeepSeek API

