# Chrometchi プライバシーポリシー / Privacy Policy

最終更新日 / Last updated: 2026-11-06

公開版 / Published at: https://mkontani.github.io/chrometchi/privacy.html (mkontani/mkontani.github.io の `chrometchi/privacy.html`。内容をこのファイルとそろえること / keep it in sync with this file)

[日本語](#日本語) · [English](#english)

## 日本語

Chrometchi(以下「本拡張機能」)は、Chrome のツールバーで遊ぶバーチャルペットのゲームです。本拡張機能は、利用者の個人情報を集めることも、外部に送ることもありません。

### 保存するデータ

本拡張機能は、次のデータを Chrome の拡張機能用ストレージ(`chrome.storage.local`)に保存します。このストレージは利用者のパソコンの中にあります。

- ペットの状態(おなか・きげん・成長など)、ずかん、見つけたレシピ、集めた食材、コインとミッションの進み具合
- 設定(通知、サウンド、ねる時刻とおきる時刻、おさんぽのオン・オフ)
- 「このサイトでは隠れる」を選んだサイトのホスト名(例: `example.com`)

本拡張機能はインターネットに接続しません。これらのデータを開発者を含む第三者に送ることも、販売することもありません。広告、アクセス解析、トラッキングは使っていません。アカウント登録も不要です。

本拡張機能が受け取る情報の扱いは、[Chrome ウェブストアのユーザーデータに関するポリシー](https://developer.chrome.com/docs/webstore/program-policies/policies)(Limited Use の要件を含む)に従います。

### Web ページでの動作(オプション)

「ページの上をおさんぽ」をオンにしたときだけ、Web サイトへのアクセス許可を求めます。許可すると、見ているページの下にペットを表示します。ページの中身(文章・画像・入力内容など)は読まず、集めません。ページのアドレスからホスト名を調べるのは、「このサイトでは隠れる」の一覧と照らし合わせるためだけです。

設定をオフにすると、アクセス許可を返し、ページにペットを出すのをやめます。

### 権限の使い道

- `storage`: 上に書いたデータを保存します。
- `alarms`: Chrome を開いているあいだ、1分ごとにペットの時間を進めます。
- `notifications`: ペットにお世話が必要なときなどに通知します。設定でオフにできます。
- `idle`: 画面がロックされているかだけを調べ、ロック中はペットの時間を止めます。
- `scripting`: おさんぽがオンのときだけ、本拡張機能に同梱したスクリプトを Web ページに登録します。
- Web サイトへのアクセス(任意): おさんぽがオンのときだけ使います。

### データの削除

本拡張機能を Chrome から削除すると、保存したデータはすべて消えます。

### このポリシーの変更

内容を変えるときは、このページを更新し、最終更新日を書き換えます。

### お問い合わせ

[itoama@gmail.com](mailto:itoama@gmail.com) または [GitHub の Issues](https://github.com/mkontani/chrometchi-extension/issues) までお寄せください。

## English

Chrometchi ("the extension") is a virtual pet game played from the Chrome toolbar. The extension does not collect personal information, and it does not send any data off your computer.

### Data the extension stores

The extension stores the following in Chrome's extension storage (`chrome.storage.local`), which lives on your own computer:

- The pet's state (hunger, mood, growth and so on), your Zukan, the recipes you have found and the ingredients you have gathered, and your coins and mission progress
- Settings: notifications, sound, bedtime and wake-up time, and whether walks on web pages are on
- The hostnames of sites where you chose "Hide on this site" (for example, `example.com`)

The extension never connects to the internet. It does not send this data to anyone, including the developer, and it does not sell it. There are no ads, no analytics and no tracking. No account is needed.

The use of information received by the extension adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies), including the Limited Use requirements.

### On web pages (optional)

The extension asks for access to websites only when you turn on "Walk on web pages". With that access, your pet appears along the bottom of the pages you browse. The extension does not read or collect page content (text, images, what you type and so on). It looks at the page's address only to compare its hostname with your "Hide on this site" list.

Turning the setting off gives the access back, and the pet stops appearing on pages.

### How each permission is used

- `storage`: saves the data listed above.
- `alarms`: moves the pet's time forward once a minute while Chrome is open.
- `notifications`: tells you when your pet needs care, among other events. You can turn notifications off in Settings.
- `idle`: checks only whether your screen is locked, so the pet's time pauses while it is.
- `scripting`: registers the extension's own bundled script on web pages, only while walks are on.
- Access to websites (optional): used only while walks are on.

### Deleting your data

Removing the extension from Chrome deletes everything it stored.

### Changes to this policy

When this policy changes, this page is updated along with the date at the top.

### Contact

Email [itoama@gmail.com](mailto:itoama@gmail.com) or open an issue on [GitHub](https://github.com/mkontani/chrometchi-extension/issues).
