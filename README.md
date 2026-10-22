# 神器传说移动客户端

可自行修改、重复构建的 Android / iOS 网页客户端壳，使用现有游戏登录页和后端。首次启动填写登录网址，也可以在 GitHub Actions 的 `game_url` 参数中设置默认地址。账号、角色和游戏逻辑仍由你的游戏网页与后端提供；仓库不含官服安装包、游戏资源、后端源码或存档。

## GitHub 上出包

1. 打开 **Actions → Build mobile clients → Run workflow**。
2. `platform` 选择 `both`、`android` 或 `ios`；`game_url` 可以留空。
3. 成功后在该次运行的 **Artifacts** 下载产物。

| 产物 | 用途 |
| --- | --- |
| `sqcs-android-debug` | 包含已用临时调试证书签名的 APK，可安装测试。不同云端构建的调试证书可能变化，更新安装不兼容时需卸载旧测试包。 |
| `sqcs-ios-unsigned` | 包含未签名 IPA，需要有效的苹果证书和描述文件重新签名才能在 iPhone 安装；不能直接安装，也不是 TestFlight 包。 |

推送到 `main` 也会自动构建两端。工作流不部署后端、不连接游戏服务器；默认地址留空。构建仅能证明工程可编译，不能代替手机内登录和玩法验证。

## 本地开发

需要 Node.js 22 或以上：

```sh
npm ci --ignore-scripts
npm run check
npm run preview
```

预览入口为 `http://127.0.0.1:4173`。浏览器预览点击“进入游戏”会跳转到填写的网址；安装包在应用内独立 WebView 打开。

```sh
npm run native -- android
npm run native -- ios
```

Android 构建需要 JDK 21 和 Android SDK 36，最低支持 Android 8。iOS 编译需要 macOS / Xcode；GitHub 的 macOS runner 可以代替本地 Mac。

## 连接现有后端

填写完整的固定登录入口，例如 `https://game.example.com/`。登录页面、Cookie、两阶段 WebSocket 和角色数据继续走现有服务，不通过客户端保存密码或直接生成登录票据。游戏页面与启动器的本地存储隔离，重新打开不会主动清除游戏 Cookie。

手机上的 `127.0.0.1` 是手机自身。测试电脑本地服时，手机需要能访问电脑的局域网地址和 HTTP / WebSocket 端口。现有服务如果只监听电脑回环地址，安装包不能直接访问；应另行建立隔离的本地测试入口，不应为此改动线上服务。当前仓库与脚本不会修改服务器、数据库、监听地址或防火墙。

后台暂停、网络掉线和重新鉴权由现有游戏页面负责，客户端壳不伪造业务成功。HTTP 和 WebSocket、登录重定向、音频、键盘、安全区、安卓返回键及 iOS Cookie 生命周期仍需要用最终安装包做真机验收。

启动器不需要相机、录音或定位，Android 构建会移除浏览器依赖附带的这些权限，并检查最终 APK。若游戏页面本身需要扫码、语音或定位，应单独评估后再增加对应权限。

## 修改名称、包名与图标

- `capacitor.config.json`：应用名称和包名。首次生成原生工程后，变更包名须同步原生工程配置。
- `package.json` 与原生工程：版本号。首版原生版本为 `1.0 / 1`，网页启动器版本为 `0.1.0`。
- `scripts/icon.mjs`：原创几何图标，`npm run native` 会生成各尺寸图标。
- `src/`：启动器界面和地址校验。
- `scripts/prepare-native.mjs`：原生工程准备、HTTP 本地测试兼容、图标和插件同步。

建议只对自己有权发布的网页和服务使用本工程。公开仓库只维护客户端壳，不应加入原始游戏包、第三方游戏资源、数据库、抓包、账号、私钥或签名证书。需回滚客户端代码时恢复前一提交并重新构建；本工程不迁移后端数据。

## 验证范围

`npm run check` 执行网址与存储行为测试、网页构建、公开源文件扫描。云端工作流执行原生 Android 编译和 iOS archive，并生成 SHA-256 校验文件。最终实际运行结果以 Actions 记录为准，不能将工作流配置存在视为构建成功。
