# 谭师训练手册

一本可以带进健身房的训练手册：推 / 拉 / 腿三分化的知识整理，加上可以直接跟练、记录的「今日训练」。

在线地址：<https://zstone12.xyz/training/>

> 基于 tanchengyi-fitness 技能的个人学习整理，**不是谭成义官方网站**。内容是学习笔记，不构成个体化的训练或饮食建议。

## 功能

- **训练手册**：七个主题的知识库，支持站内搜索，可对照技能原文与原版视频。
- **今日训练**：胸 / 背 / 腿三个训练日，含热身、动作示范、逐组记录重量与次数、组间休息计时。
- **账号与同步**：注册登录后，训练记录按用户保存到服务器，换设备可继续。不登录也能照常使用，记录只留在当前浏览器。
- **训练日历**：按月显示，训练过的日期会标注练了什么，点开可看当天完成的动作和组次。
- **分享图**：把当天的训练内容生成一张图片，直接保存。

## 目录结构

```
dist/                 静态站点（无构建步骤，直接部署）
  index.html          入口；各页面由 app.js 按 hash 路由渲染
  app.js              路由、首页、手册、搜索、主题
  data.js             手册与动作数据
  workout.js          今日训练：训练计划、组次记录、休息计时
  account.js          登录注册、记录同步、训练日历
  share.js            分享图（canvas 绘制）
  original-videos.js  原版视频目录与播放
  media/opengym/      动作示范素材（见下方「素材与版权」）
  originals/          技能原文（Markdown）
server/
  server.py           账号与训练记录 API（仅用 Python 标准库 + SQLite）
  dev.py              本地联调：静态文件 + 把 /training/api/* 转发给 server.py
  zs12-training.service  systemd 单元
scripts/deploy.sh     发布脚本
docs/                 历次界面与内容评审记录
```

## 本地运行

需要 Python 3.10+，没有其他依赖。开两个终端：

```bash
# 1. 后端（本地数据库放在 /tmp，Cookie 不要求 HTTPS）
TRAINING_DB=/tmp/training-dev.db TRAINING_COOKIE_SECURE=0 \
TRAINING_ORIGINS=http://127.0.0.1:8765 python3 server/server.py

# 2. 静态站点 + 接口转发
python3 server/dev.py
```

然后打开 <http://127.0.0.1:8765/training/>。只看静态页面、不需要登录功能的话，只跑第 2 步即可。

## 部署

线上由 Caddy 提供静态文件，并把 `/training/api/*` 反向代理给后端：

```caddyfile
handle /training/api/* {
	reverse_proxy localhost:3014
}
handle {
	root * /var/www/zy5-tools
	encode zstd gzip
	@trainingHtml path /training /training/ /training/index.html
	header @trainingHtml Cache-Control "no-cache"
	file_server
}
```

静态站点按版本目录发布：每个版本是 `/var/www/tanchengyi-releases/` 下的一个独立目录，Web 根目录里的 `training` 是指向当前版本的软链接。

改动合并到 `main` 并推送后，一条命令发布：

```bash
scripts/deploy.sh            # 发布当前提交
scripts/deploy.sh status     # 线上是哪个提交、本地领先多少
scripts/deploy.sh rollback   # 把静态站点切回上一个版本
scripts/deploy.sh --dry-run  # 只看将要发布什么
```

脚本会做这些事：

1. 要求工作区干净且 `HEAD` 已推送，保证线上内容一定对应仓库里的某个提交。
2. 给 `index.html` 引用的 JS / CSS 自动打上内容哈希（`?v=…`），不需要手动改版本号。
3. 在服务器上新建版本目录（如 `20261123-063547-071ef71`），此时还没有流量。
4. 后端有变化时才更新并重启；重启后健康检查不通过会自动回滚 `server.py`，并放弃这次发布。
5. 原子切换软链接到新版本，在服务器上记录本次发布的提交号。
6. 清理脚本自己创建的旧版本目录，保留最近 10 个。

`rollback` 只切换静态站点，不回退后端和数据库。

目标主机等通过环境变量配置，见脚本开头的说明。例如需要经跳板机连接时：

```bash
DEPLOY_SSH_OPTS="-J 跳板机" scripts/deploy.sh
```

## 后端

`server/server.py` 监听 `127.0.0.1:3014`，数据存在 SQLite（systemd 的 `StateDirectory`，即 `/var/lib/zs12-training/training.db`）。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/training/api/me` | 当前登录用户 |
| POST | `/training/api/register` | 注册并登录 |
| POST | `/training/api/login` | 登录 |
| POST | `/training/api/logout` | 退出登录 |
| GET | `/training/api/records?month=YYYY-MM` | 当月有训练的日期及摘要（日历用） |
| GET | `/training/api/records/YYYY-MM-DD` | 某天的完整记录 |
| PUT | `/training/api/records/YYYY-MM-DD` | 保存某天的记录（整天覆盖） |
| POST | `/training/api/records/import` | 批量补充服务器上还没有的日期 |

几点设计说明：

- 密码用 scrypt 加盐哈希；会话是随机令牌，服务器只存它的哈希，Cookie 为 `HttpOnly`、`Secure`、`SameSite=Lax`，有效期 90 天。
- 写请求会校验 `Origin`；注册、登录、写入都有频率限制；用户数、单日记录大小、每用户记录数都有上限。
- 同步以「用户 + 日期」为单位整天覆盖，多设备同时修改同一天时，后保存的生效。
- 没有邮箱环节，因此没有自助找回密码。管理员可在服务器上重设：

```bash
cd /opt/zs12-training
sudo -u www-data TRAINING_DB=/var/lib/zs12-training/training.db python3 server.py users
sudo -u www-data TRAINING_DB=/var/lib/zs12-training/training.db python3 server.py passwd <用户名>
```

## 素材与版权

- **动作示范素材**（`dist/media/opengym/`）版权归 © Aliaksandr Makatserchyk / [Gym visual](https://gymvisual.com/) 所有，来源于 [openGym](https://github.com/DuarteSantos8/openGym) 动作目录，属于专有素材。本站按站点所有者取得的独立授权使用；**该授权不延伸给其他人**，如需使用这些素材，请自行向 Gym visual 获取授权。详见 [`dist/media/opengym/NOTICE.txt`](dist/media/opengym/NOTICE.txt)。
- **训练内容**整理自谭成义公开视频的学习笔记，原视频版权归原作者所有，站内仅提供链接与对照。
- 仓库未附带开源许可证，代码部分如需复用请先联系作者。
