# OP/ED Speed Resetter for Amazon Prime Video

Amazon Prime Videoで動画再生中に以下のタイミングで再生速度を1.0にリセットするユーザースクリプト。
- イントロスキップボタンが出現するタイミング
- Next upが出現するタイミング以降

このユーザースクリプトは日本のAmazon（amazon.co.jp）でのみ機能します。

通信をインターセプトして作品ごとのイントロスキップボタン・Next upの表示タイミングのデータを取得し、そのデータを使用して機能します。作品によってはイントロスキップボタン・Next upが表示されない（表示タイミングが設定されていない）場合があり、その場合にはこのユーザースクリプトは機能しません。

以下の機能を実装しています。
- イントロスキップボタンが出現するタイミングで再生速度を1.0に変更する
  - ミリ秒単位でのタイミング調整が可能
  - イントロスキップボタンが消えるタイミングで任意の再生速度に変更することも可能
- Next upが出現するタイミングで再生速度を1.0に変更する
  - ミリ秒単位でのタイミング調整が可能

動画右上にオプションダイアログを開くことができるオプションアイコンが追加されます。オプションダイアログでは上記機能の有効/無効の切り替えが可能です。