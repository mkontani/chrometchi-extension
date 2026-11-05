# Chrome Web Store 掲載情報

ストアの管理画面(デベロッパー ダッシュボード)に貼る文章を、欄ごとにまとめたものです。画像は `screenshots/` にあり、`npm run screenshots` で作り直せます。

ストアの文章には、スクリーンショットと同じ決まりを当てはめています(`e2e/store/copy.ts`)。

- ブラウザでペットを飼う体験を伝える。
- 数(姿・食べ物・分など)は、古くなるので書かない。
- 今のゲームにある機能だけを書く。

## 1. 名前と概要(manifest から自動で入る)

この2つは管理画面では書き換えられません。`public/_locales/{ja,en}/messages.json` の値が、アップロードした zip から読み込まれます。

| 欄 | キー | 上限 | 日本語 | English |
| --- | --- | --- | --- | --- |
| 名前 | `extName` | 75文字 | Chrometchi - ブラウザで育てるドット絵ペット | Chrometchi - Pixel Pet for Your Browser |
| 概要 | `appDescription` | 132文字 | ツールバーに住む、ドット絵のちいさなペット。たまごから育てて、お世話とミニゲームで進化させ、出会った姿をずかんに集めよう。 | A tiny pixel-art pet that lives in your toolbar. Hatch an egg, care for it, play mini-games, and collect every form it grows into. |

通知のタイトルとツールバーのヒントは、今までどおり `appName`(Chrometchi)を使います。

## 2. ストアの掲載情報タブ

### 説明(日本語)

```text
ブラウザで、ちいさなペットを飼おう。

Chrometchi は、Chrome のツールバーに住むドット絵のバーチャルペットです。たまごからかえして、ごはんをあげたり、いっしょに遊んだりしながら育てます。育て方しだいで大人の姿が変わり、出会った姿は「ずかん」に集まっていきます。アイコンをクリックすれば、作業の合間にいつでも会えます。

■ お世話して育てる
・たまご、あかちゃん、こども、わかもの、おとなと育っていきます。
・ごはんとおやつ、うんちのおそうじ、びょうきのときのくすり、夜の消灯。なでると、うれしそうに笑います。
・ミニゲーム「キャッチ」「カップあて」「ストップ」で遊ぶと、ごきげんになって、いい運動にもなります。

■ 育て方で、進化が変わる
・何を食べ、何で遊び、どれだけ大事にされたか。お世話のしかたで大人の姿が決まります。
・めったに出会えない、ひみつの姿もあります。
・出会った姿は「ずかん」にずっと残ります。これまで育てたペットの思い出も見返せます。

■ 食材を集めて、料理する
・「つり」「かり」「さいしゅう」のミニゲームと「はたけ」で、食材を集めます。
・いつでもあげられるのは、ごはんとおやつだけ。ほかの食べ物は、集めた食材から用意します。
・なべに食材を入れて料理しましょう。見つけたレシピは「ずかん」に残ります。

■ Web ページの上をおさんぽ(オプション)
・「せってい」でオンにすると、ペットが見ているページの下をてくてく歩きます。
・クリックすると様子を話し、ドラッグでよけられます。じゃまなサイトでは「このサイトでは隠れる」で隠せます。
・サイトへのアクセス許可は、この機能をオンにしたときだけお願いします。オフのあいだは、どのページにも何もしません。

■ 毎日のペースに合わせて
・時間が進むのは、Chrome を開いているあいだだけ。画面をロックしているあいだも止まります。
・夜はぐっすり眠ります。ねる時刻とおきる時刻は「せってい」で変えられます。眠ったら電気を消してあげましょう。
・おなかがすいた、ぐあいがわるいなど、困ったときは通知でお知らせします。お世話をしないと弱ってしまいますが、手おくれになる前に警告します。通知はオフにもできます。
・ピコピコの効果音つき(最初はオフ)。
・日本語と英語に対応しています。

■ プライバシー
・アカウント登録は不要です。
・データはすべてお使いのパソコンの Chrome の中に保存され、外部には送信されません。広告もありません。

不具合の報告やご意見は、サポートページまでお寄せください。
```

### 説明(English)

```text
Keep a tiny pet in your browser.

Chrometchi is a pixel-art virtual pet that lives in your Chrome toolbar. Hatch an egg, feed it, play with it and watch it grow. How you raise it decides what it becomes, and every form you meet is saved in your Zukan, a collection book. It is always one click away, ready for a short break between tabs.

■ Raise it with care
• It grows from an egg into a baby, a kid, a teen and finally an adult.
• Meals and treats, cleaning up after it, medicine when it is sick, and lights out at bedtime. Give it a pat and watch it light up.
• Play the mini-games Catch, Cups and Stop to lift its mood and keep it fit.

■ Raise it your way, see what it becomes
• What it eats, how you play and how well you look after it decide its adult form.
• Some forms are rare and secret.
• Every form you meet stays in your Zukan, along with memories of the pets you raised before.

■ Gather ingredients and cook
• Go fishing, hunting and gathering, and tend a small farm to fill your pantry.
• Rice and candy are always on hand. Every other food comes from what you gather.
• Put ingredients in the pot and cook. Every recipe you find is kept in your Zukan.

■ Walks on web pages (optional)
• Turn it on in Settings and your pet strolls along the bottom of the pages you browse.
• Click it to hear how it is doing, drag it out of the way, or choose "Hide on this site".
• Site access is asked for only when you turn this on. While it is off, Chrometchi does nothing on any web page.

■ Fits your day
• Time only passes while Chrome is open, and it pauses while your screen is locked.
• Your pet sleeps at night. Set its bedtime and wake-up time in Settings, and turn off the lights once it is asleep.
• A notification tells you when it is hungry, sick or needs you. Neglect weakens it, but you are warned before it is too late. Notifications can be turned off.
• Optional chiptune sound effects (off by default).
• Available in English and Japanese.

■ Privacy
• No account needed.
• Everything is saved in Chrome on your own computer and never sent anywhere. No ads, no tracking.

Found a bug or have an idea? Let us know on the support page.
```

### そのほかの欄

| 欄 | 入れるもの |
| --- | --- |
| カテゴリ | ライフスタイル › ゲーム(Lifestyle › Games) |
| 言語 | 英語(既定)。日本語の説明は「ローカライズ」で日本語を選んで貼る |
| 公式 URL | なし(Google Search Console で確認したサイトがないため) |
| ホームページ URL | https://mkontani.github.io/chrometchi/ |
| サポート URL | https://mkontani.github.io/chrometchi/support.html |
| 成人向けコンテンツ | オフ |

## 3. プライバシーへの取り組みタブ

審査する人が読む欄なので、英語で書いています。各項目の下の「訳」は、確認のための日本語訳です(管理画面には貼りません)。

### 単一用途の説明

```text
Chrometchi is a virtual pet game. The player raises a pixel-art pet from the toolbar popup: caring for it, playing mini-games with it, gathering food for it, and collecting the forms it grows into. An optional setting lets the same pet walk along the bottom of web pages.
```

訳: Chrometchi はバーチャルペットのゲームです。ツールバーのポップアップから、お世話・ミニゲーム・食材集めをしながらペットを育て、育った姿を集めます。オプションで、同じペットが Web ページの下を歩きます。

### 権限が必要な理由

**storage**

```text
Saves the pet, the player's collection, recipes and settings in chrome.storage.local, so the game carries on after Chrome restarts. Nothing is sent off the device.
```

訳: ペット・ずかん・レシピ・設定をこのパソコンに保存し、Chrome を再起動しても続きから遊べるようにします。外部には送りません。

**alarms**

```text
A once-a-minute alarm moves the pet's time forward (hunger, mood, sleep, growth) while Chrome is open, even when the popup is closed.
```

訳: 1分ごとのアラームで、ポップアップを閉じていてもペットの時間(おなか・きげん・眠り・成長)を進めます。

**notifications**

```text
Tells the player when the pet needs care (hungry, unhappy, sick, needs cleaning up), when it hatches or grows into a new form, when it falls asleep and the lights should go off, and warns before its life is in danger. Notifications can be turned off in Settings.
```

訳: お世話が必要なとき、生まれたとき・進化したとき、眠って電気を消すときに知らせ、命があぶなくなる前に警告します。設定でオフにできます。

**idle**

```text
Checks only whether the screen is locked (chrome.idle.queryState), so the pet's time pauses while the player is away with the screen locked.
```

訳: 画面がロックされているかだけを調べ、ロック中はペットの時間を止めます。

**scripting**

```text
Used only when the player turns on the optional "Walk on web pages" setting. It registers the extension's own bundled script, which draws the pet along the bottom of pages, and unregisters it when the setting is turned off. No remote code is run.
```

訳: オプションの「ページの上をおさんぽ」をオンにしたときだけ使います。拡張に同梱したスクリプト(ページの下にペットを描く)を登録し、オフにすると登録を外します。外部のコードは実行しません。

**ホストの権限(任意: http://\*/\*, https://\*/\*)**

```text
Optional. Requested only when the player turns on "Walk on web pages", so the pet can appear on the pages they visit. The script does not read or collect page content; it only checks the page's hostname against the player's own "Hide on this site" list. Turning the setting off gives the permission back.
```

訳: 任意の権限です。「ページの上をおさんぽ」をオンにしたときだけ求め、見ているページにペットを出します。ページの中身は読まず、集めません。ページのホスト名を「このサイトでは隠れる」の一覧と照らし合わせるだけです。設定をオフにすると権限を返します。

### リモートコード

「いいえ、リモートコードを使用していません」を選びます。

### データの使用

- 集めるデータの種類: **どれにもチェックを入れない**。
  - 保存するのはゲームのデータと設定だけです。外部には送りません。
  - 「このサイトでは隠れる」で選んだホスト名は、本人が選んだ設定です。見たページの履歴ではありません。この扱いはプライバシーポリシーに書いています。
- 開示に関する3つの宣言: **すべてにチェックを入れる**。

### プライバシー ポリシー

```text
https://mkontani.github.io/chrometchi/privacy.html
```
