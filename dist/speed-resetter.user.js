// ==UserScript==
// @name          OP/ED Speed Resetter for Amazon Prime Video
// @namespace     https://ryo-fujinone.net/
// @version       0.1.0
// @description   Amazon Prime Videoで「OP中とED以降」のタイミングで再生速度を1.0にリセットします
// @author        ryo-fujinone
// @match         https://*.amazon.co.jp/*
// @require       https://jpillora.com/xhook/dist/xhook.min.js
// @grant         none
// @license       MIT; https://github.com/ryo-fujinone/speed-resetter-for-amazon-prime-video/blob/main/LICENSE
// ==/UserScript==

(function () {
  'use strict';

  const RANDOM = window.crypto.randomUUID().replaceAll("-", "");

  const metadataArray = [];
  let mpdId;

  const getDefaultOptions = () => {
    return {
      resetIntroSpeed: true,
      resetIntroSpeedTimingFix: true,
      resetIntroSpeedTimingFix_val: 3000,
      changeSpeedAfterIntro: false,
      changeSpeedAfterIntro_val: 2.0,
      resetEdSpeed: true,
      resetEdSpeedTimingFix: true,
      resetEdSpeedTimingFix_val: 5000,
      scriptVersion: "0.1.0",
    };
  };

  xhook.after((request, response) => {
    const url = request.url;
    if (url.includes(".mp4")) {
      // mp4のURLを監視してファイル名に含まれるIDを保存する
      const pathname = new URL(url).pathname;
      const found = pathname.match(/([0-9a-zA-Z-]+)_(video|audio)_\d+\.mp4$/);
      if (!found) {
        return;
      }
      mpdId = found[1];
    } else {
      // 各コンテンツのメタデータを取得して配列に保存する
      if (
        !url.includes("GetPlaybackResources") ||
        !url.includes("CatalogMetadata") ||
        !url.includes("TransitionTimecodes")
      ) {
        return;
      }
      if (response.status !== 200) {
        return;
      }

      try {
        const data = JSON.parse(response.text);
        metadataArray.push(data);
        if (metadataArray.length > 20) {
          metadataArray.shift();
        }
      } catch (e) {
        console.log(e);
      }
    }
  });

  const getScriptInfo = () => {
    // user script
    try {
      const gmInfo = window.GM_info || GM_info;
      const scriptVer = gmInfo.script.version;
      if (typeof scriptVer === "string") {
        return {
          scriptType: "user-script",
          scriptVersion: scriptVer,
        };
      }
    } catch (e) {
      // console.log(e);
    }

    // unknown
    return {
      scriptType: "unknown",
      scriptVersion: getDefaultOptions().scriptVersion,
    };
  };

  const addStyle = (css, id) => {
    const style = document.createElement("style");
    if (id) {
      style.setAttribute("id", id);
    }
    style.textContent = css;
    document.head.appendChild(style);
  };

  const saveDefaultOptions = () => {
    const jsonStr = JSON.stringify(getDefaultOptions());
    localStorage.setItem("speed-resetter-ext", jsonStr);
  };

  const getOptions = () => {
    const jsonStr = localStorage.getItem("speed-resetter-ext");
    if (!jsonStr) {
      saveDefaultOptions();
      return getDefaultOptions();
    }
    return JSON.parse(jsonStr);
  };

  const saveOptions = (_newOptions = {}) => {
    const options = getOptions();
    const newOptions = {
      ...options,
      ..._newOptions,
    };
    const jsonStr = JSON.stringify(newOptions);
    localStorage.setItem("speed-resetter-ext", jsonStr);
  };

  const updateOptionVersion = (scriptInfo) => {
    const options = getOptions();
    if (options.scriptVersion === scriptInfo.scriptVersion) {
      return;
    }

    const defaultOptions = getDefaultOptions();
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      scriptVersion: scriptInfo.scriptVersion,
    };
    const mergedOptionsKeys = Object.keys(mergedOptions);
    const newOptions = mergedOptionsKeys.reduce((obj, key) => {
      if (Object.hasOwn(defaultOptions, key)) {
        obj[key] = mergedOptions[key];
      }
      return obj;
    }, {});
    const jsonStr = JSON.stringify(newOptions);
    localStorage.setItem("speed-resetter-ext", jsonStr);
  };

  const getOptionDialog = () => {
    return document.querySelector(`.ext${RANDOM}-opt-dialog`);
  };

  const getVisibleVideo = () => {
    return document.querySelector(".dv-player-fullscreen video");
  };

  const playVideo = () => {
    const video = getVisibleVideo();
    if (!video) {
      return;
    }
    if (video.paused) {
      video.play();
    }
  };

  const pauseVideo = () => {
    const video = getVisibleVideo();
    if (!video) {
      return;
    }
    if (!video.paused) {
      video.pause();
    }
  };

  const worksWithDialog = {
    clickedOutSide: null,
    _clickedOutSide: function (e) {
      if (e.target.classList.contains(`ext${RANDOM}-opt-dialog`)) {
        e.target.close();
        this.whenClosed();
      }
    },
    whenOpening: function () {
      pauseVideo();
      if (!this.clickedOutSide) {
        this.clickedOutSide = this._clickedOutSide.bind(this);
      }
      document.addEventListener("click", this.clickedOutSide);
    },
    whenClosed: function () {
      document.removeEventListener("click", this.clickedOutSide);
      playVideo();
    },
  };

  const createOptionMessages = () => {
    return {
      promptReloadPage: "オプションを変更した場合はページをリロードしてください",
      resetIntroSpeed:
        "イントロスキップボタンが出現するタイミングで再生速度を1.0に変更する",
      resetIntroSpeedTimingFix:
        "イントロスキップボタンが出現する$$$前に再生速度を変更する",
      changeSpeedAfterIntro:
        "イントロスキップボタンが消えるタイミングで再生速度を$$$に変更する",
      resetEdSpeed: "Next upが出現するタイミングで再生速度を1.0に変更する",
      resetEdSpeedTimingFix: "Next upが出現する$$$前に再生速度を変更する",
      ms: "ミリ秒",
      close: "閉じる",
    };
  };

  const createOptionDialog = (scriptVersion) => {
    const messages = createOptionMessages();

    messages.resetIntroSpeedTimingFix_ =
      messages.resetIntroSpeedTimingFix.split("$$$");
    messages.changeSpeedAfterIntro_ = messages.changeSpeedAfterIntro.split("$$$");
    messages.resetEdSpeedTimingFix_ = messages.resetEdSpeedTimingFix.split("$$$");

    const dialogName = `ext${RANDOM}-opt-dialog`;
    const options = getOptions();

    const dialogHtmlStr = `
    <dialog class="${dialogName}"><div class="dialog-inner">
      <div class="${dialogName}-note">
        <p>${messages.promptReloadPage}</p>
      </div>
      <div class="${dialogName}-opt-wrapper">
      <label>
        <input type="checkbox" id="reset-intro-speed" name="reset-intro-speed" ${
          options.resetIntroSpeed ? "checked" : ""
        } />
        <p>${messages.resetIntroSpeed}</p>
      </label>
      <label class="indent1">
        <input type="checkbox" id="reset-intro-speed-timing-fix" name="reset-intro-speed-timing-fix" ${
          options.resetIntroSpeedTimingFix ? "checked" : ""
        } />
        <p>
          <span>${messages.resetIntroSpeedTimingFix_[0]}</span>
          <input type="number" id="reset-intro-speed-timing-fix_val" placeholder="3000" step="1" min="0" value="${
            options.resetIntroSpeedTimingFix_val
          }" />
          <span>${messages.ms}${messages.resetIntroSpeedTimingFix_[1]}</span>
        </p>
      </label>
      <label class="indent1">
        <input type="checkbox" id="change-speed-after-intro" name="change-speed-after-intro" ${
          options.changeSpeedAfterIntro ? "checked" : ""
        } />
        <p>
          <span>${messages.changeSpeedAfterIntro_[0]}</span>
          <input type="number" id="change-speed-after-intro_val" placeholder="2.0" step="0.1" min="0.1" value="${
            options.changeSpeedAfterIntro_val
          }" />
          <span>${messages.changeSpeedAfterIntro_[1]}</span>
        </p>
      </label>
      <label>
        <input type="checkbox" id="reset-ed-speed" name="reset-ed-speed" ${
          options.resetEdSpeed ? "checked" : ""
        } />
        <p>${messages.resetEdSpeed}</p>
      </label>
      <label class="indent1">
        <input type="checkbox" id="reset-ed-speed-timing-fix" name="reset-ed-speed-timing-fix" ${
          options.resetEdSpeedTimingFix ? "checked" : ""
        } />
        <p>
          <span>${messages.resetEdSpeedTimingFix_[0]}</span>
          <input type="number" id="reset-ed-speed-timing-fix_val" placeholder="5000" step="1" min="0" value="${
            options.resetEdSpeedTimingFix_val
          }" />
          <span>${messages.ms}${messages.resetEdSpeedTimingFix_[1]}</span>
        </p>
      </label>
      </div>
      <div class="${dialogName}-btn-wrapper">
        <button id="${dialogName}-close">${messages.close}</button>
        <div class="${dialogName}-version"><span>v${scriptVersion}</span></div>
      </div>
    </div></dialog>
    `;
    document.body.insertAdjacentHTML("beforeend", dialogHtmlStr);

    const css = `
    .${dialogName} {
      padding: 0;
      word-break: break-all;
    }
    .${dialogName} .dialog-inner {
      padding: 14px;
    }
    .${dialogName}-note {
      text-align: center;
      color: green;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .${dialogName} label {
      display: flex;
    }
    .${dialogName} label.indent1 {
      margin-left: 14px;
    }
    .${dialogName} label input[type='checkbox'] {
    }
    .${dialogName} label p {
      display: flex;
      margin-bottom: 5px;
      width: calc(100% - 24px);
    }
    .${dialogName} label input[type='number'] {
      height: 20px;
      margin: 0 4px;
    }
    .${dialogName} #reset-intro-speed-timing-fix_val, .${dialogName} #reset-ed-speed-timing-fix_val {
      width: 84px;
    }
    .${dialogName} #change-speed-after-intro_val {
      width: 70px;
    }
    .${dialogName} .${dialogName}-btn-wrapper {
      margin-top: 12px;
      position: relative;
    }
    .${dialogName} div:has(#${dialogName}-close):not(.dialog-inner) {
      text-align: center;
    }
    #${dialogName}-close {
      border-color: black;
      border: solid 1px;
      background-color: #EEE
      width: 120px;
      letter-spacing: 4px;
    }
    #${dialogName}-close:hover {
      background-color: #DDD
    }
    .${dialogName}-version {
      position: absolute;
      bottom: 0px;
      right: 0px;
    }
    `;
    addStyle(css);

    const optDialog = getOptionDialog();

    // ダイアログの幅の調整
    optDialog.style.setProperty("visibility", "hidden", "important");
    optDialog.toggleAttribute("open");
    let maxWidth = 650;
    if (optDialog.offsetWidth > 500) {
      maxWidth = optDialog.offsetWidth + 14;
    }
    optDialog.style.maxWidth = maxWidth + "px";
    optDialog.style.width = "100%";
    optDialog.toggleAttribute("open");
    optDialog.style.setProperty("visibility", "");

    // 設定の保存
    optDialog.addEventListener("click", (e) => {
      const idName = e.target.id;
      if (idName === "") {
        return;
      }

      let checked = true;
      if (e.target.type === "checkbox") {
        checked = e.target.checked;
      }

      switch (idName) {
        case "reset-intro-speed":
          saveOptions({ resetIntroSpeed: checked });
          break;
        case "reset-intro-speed-timing-fix":
          saveOptions({ resetIntroSpeedTimingFix: checked });
          break;
        case "reset-intro-speed-timing-fix_val":
          saveOptions({
            resetIntroSpeedTimingFix_val: parseInt(e.target.value),
          });
          break;
        case "change-speed-after-intro":
          saveOptions({ changeSpeedAfterIntro: checked });
          break;
        case "change-speed-after-intro_val":
          saveOptions({
            changeSpeedAfterIntro_val: parseFloat(e.target.value),
          });
          break;
        case "reset-ed-speed":
          saveOptions({ resetEdSpeed: checked });
          break;
        case "reset-ed-speed-timing-fix":
          saveOptions({ resetEdSpeedTimingFix: checked });
          break;
        case "reset-ed-speed-timing-fix_val":
          saveOptions({ resetEdSpeedTimingFix_val: parseInt(e.target.value) });
          break;
        case `${dialogName}-close`:
          optDialog.close();
          worksWithDialog.whenClosed();
          break;
      }
    });
  };

  const createOptionBtn = (player) => {
    new MutationObserver((_, observer) => {
      if (player.querySelector(`.ext${RANDOM}-opt-btn-container`)) {
        observer.disconnect();
        return;
      }

      const btnsContainer = player.querySelector(
        ".atvwebplayersdk-hideabletopbuttons-container"
      );
      if (!btnsContainer) {
        return;
      }
      observer.disconnect();

      const optContainer = btnsContainer.querySelector(
        ".atvwebplayersdk-options-wrapper span div:has(.atvwebplayersdk-optionsmenu-button)"
      );
      const clone = optContainer.cloneNode(true);
      clone.classList.add(`ext${RANDOM}-opt-btn-container`);
      btnsContainer
        .querySelector("div:has(.atvwebplayersdk-options-wrapper)")
        .appendChild(clone);

      const cloneOptBtn = clone.querySelector(
        ".atvwebplayersdk-optionsmenu-button"
      );
      cloneOptBtn.classList.remove("atvwebplayersdk-optionsmenu-button");
      cloneOptBtn.classList.add(`ext${RANDOM}-opt-btn`);

      const cloneOptBtnImg = cloneOptBtn.querySelector("img");
      cloneOptBtnImg.style.filter =
        "sepia(100%) saturate(2000%) hue-rotate(-10deg)";

      const cloneTooltip = clone.querySelector("button + div div");
      cloneTooltip.textContent = "Option - OP/ED Speed Resetter";

      cloneOptBtn.addEventListener("click", (_) => {
        const optDialog = getOptionDialog();
        worksWithDialog.whenOpening();
        optDialog.showModal();
      });
    }).observe(document, { childList: true, subtree: true });
  };

  class SpeedResetter {
    #player;
    #video;
    #options;
    #currentMetadata;
    #identifyMetadata;
    #controlVideoSpeed;
    #canResetIntroVideoSpeed;
    #canChangeVideoSpeed;
    #canResetEdVideoSpeed;
    #videoSrc;
    #videoSrcObserver;

    constructor(player, video, options) {
      this.#player = player;
      this.#video = video;
      this.#options = options || getDefaultOptions();
      this.#identifyMetadata = this.#_identifyMetadata.bind(this);
      this.#controlVideoSpeed = this.#_controlVideoSpeed.bind(this);
      this.#videoSrcObserver = this.#createVideoSrcObserver();
    }

    // メタデータの特定（timeupdateイベントのコールバック）
    #_identifyMetadata(event) {
      if (!event) {
        return;
      }

      // タイトルがDOMに反映されるのを待機する
      let title = this.#player.querySelector(
        ".atvwebplayersdk-subtitle-text"
      ).textContent;
      if (!title) {
        // 映画などの場合はsubtitle-textが無いのでこちらのタイトルを監視
        title = this.#player.querySelector(
          ".atvwebplayersdk-title-text"
        ).textContent;
      }
      if (!title) {
        return;
      }

      // mpdのIDからメタデータを特定する
      const metadata = metadataArray.find((d) => {
        const defaultUrlSetId = d?.playbackUrls?.defaultUrlSetId;
        if (!defaultUrlSetId) return;
        const mpdUrl =
          d?.playbackUrls?.urlSets[defaultUrlSetId].urls.manifest.url;
        return mpdUrl.includes(mpdId);
      });
      if (!metadata) {
        return;
      }

      // このタイミングでDOMのタイトルにメタデータのタイトルが含まれるかどうかを検証をしないと不適切なメタデータで後の処理に進んでしまう場合があった
      // （subtitle-textは「シーズン」や「エピソード」といった文字列を含むので、一致するかどうかの検証は不適切）
      if (!title.includes(metadata.catalogMetadata?.catalog?.title)) {
        return;
      }

      this.#currentMetadata = metadata;
      console.log(`検出 「${metadata.catalogMetadata?.catalog?.title}」`);
      console.log(metadata.transitionTimecodes);

      this.#video.removeEventListener("timeupdate", this.#identifyMetadata);
      this.#video.addEventListener("timeupdate", this.#controlVideoSpeed);

      // 自動再生による遷移或いは「次のエピソード」クリックによる遷移を監視
      // （動画を閉じた際にvideoSrcObserverをdisconnectするので↑の条件以外では動作しない）
      this.#videoSrc = this.#video.getAttribute("src");
      this.#videoSrcObserver.observe(this.#video, { attributes: true });
    }

    #initControlVideoSpeedStates() {
      this.#canResetIntroVideoSpeed = true;
      this.#canChangeVideoSpeed = false;
      this.#canResetEdVideoSpeed = true;
    }

    // 再生速度の制御（timeupdateイベントのコールバック）
    #_controlVideoSpeed(event) {
      if (!event) {
        return;
      }
      const transitionTimecodes = this.#currentMetadata?.transitionTimecodes;
      if (!transitionTimecodes) {
        return;
      }

      let existsIntroTimeCodes = false;
      let introTimeCodes;
      if (transitionTimecodes.skipElements) {
        introTimeCodes = transitionTimecodes.skipElements.find(
          (obj) => obj.elementType === "INTRO"
        );
        existsIntroTimeCodes = !!introTimeCodes;
      }
      const existsEdTimeCodes =
        !!transitionTimecodes.endCreditsStart ||
        !!transitionTimecodes.outroCreditsStart;

      const currentTime = event.target.currentTime;
      const fixedCurrentTime = currentTime * 1000;

      if (this.#options.resetIntroSpeed && existsIntroTimeCodes) {
        this.#controlIntroSpeed(introTimeCodes, fixedCurrentTime);
      }

      if (this.#options.resetEdSpeed && existsEdTimeCodes) {
        this.#controlEdSpeed(transitionTimecodes, fixedCurrentTime);
      }
    }

    // OP中の再生速度の制御
    #controlIntroSpeed(introTimeCodes, currentTime) {
      let startTimecodeMs = introTimeCodes.startTimecodeMs;
      if (this.#options.resetIntroSpeedTimingFix) {
        // OPと全くの同時ではなく微妙に遅れている作品もあったので調整できるようにしている
        startTimecodeMs =
          startTimecodeMs - this.#options.resetIntroSpeedTimingFix_val;
      }
      if (0 > startTimecodeMs) {
        startTimecodeMs = 0;
      }
      const endTimecodeMs = introTimeCodes.endTimecodeMs;

      if (currentTime <= startTimecodeMs) {
        this.#canResetIntroVideoSpeed = true;
      }

      // 再生速度を1.0に変更
      if (
        currentTime >= startTimecodeMs &&
        currentTime < endTimecodeMs &&
        this.#canResetIntroVideoSpeed
      ) {
        this.#video.playbackRate = 1.0;
        console.log("再生速度を1.0に変更");
        this.#canResetIntroVideoSpeed = false;
        this.#canChangeVideoSpeed = true;
      }

      // イントロスキップボタンが消えるタイミングで再生速度を任意の値に変更
      if (currentTime >= endTimecodeMs && this.#canChangeVideoSpeed) {
        if (this.#options.changeSpeedAfterIntro) {
          this.#video.playbackRate = this.#options.changeSpeedAfterIntro_val;
          console.log(
            `再生速度を${this.#options.changeSpeedAfterIntro_val}に変更`
          );
          this.#canChangeVideoSpeed = false;
        }
      }

      if (currentTime > endTimecodeMs) {
        this.#canResetIntroVideoSpeed = true;
      }
    }

    // ED以降の再生速度の制御
    #controlEdSpeed(transitionTimecodes, currentTime) {
      //両方の値が存在する場合は小さい方（タイミングの早い方）を使用する
      let timecodeArray = [
        transitionTimecodes.endCreditsStart,
        transitionTimecodes.outroCreditsStart,
      ];
      timecodeArray = timecodeArray.filter((n) => !isNaN(n));
      let targetTimecodeMs = Math.min(...timecodeArray);

      if (this.#options.resetEdSpeedTimingFix) {
        // EDと全くの同時ではなく微妙に遅れている作品もあったので調整できるようにしている
        targetTimecodeMs -= this.#options.resetEdSpeedTimingFix_val;
      }

      // 再生速度を1.0に変更
      if (currentTime >= targetTimecodeMs && this.#canResetEdVideoSpeed) {
        this.#video.playbackRate = 1.0;
        console.log("再生速度を1.0に変更");
        this.#canResetEdVideoSpeed = false;
      }

      if (currentTime < targetTimecodeMs) {
        this.#canResetEdVideoSpeed = true;
      }
    }

    #createVideoSrcObserver() {
      return new MutationObserver((_, observer) => {
        const newVideoSrc = this.#video.getAttribute("src");
        if (this.#videoSrc !== newVideoSrc) {
          observer.disconnect();
          this.#video.removeEventListener("timeupdate", this.#controlVideoSpeed);
          this.#initControlVideoSpeedStates();
          this.#video.addEventListener("timeupdate", this.#identifyMetadata);
        }
      });
    }

    #detectOpenClose() {
      new MutationObserver((_, outerObserver) => {
        if (!this.#player.classList.contains("dv-player-fullscreen")) {
          // console.log("Video closed.");
          outerObserver.disconnect();
          this.#video.removeEventListener("timeupdate", this.#identifyMetadata);
          this.#video.removeEventListener("timeupdate", this.#controlVideoSpeed);
          this.#videoSrcObserver.disconnect();

          new MutationObserver((_, observer) => {
            if (this.#player.classList.contains("dv-player-fullscreen")) {
              observer.disconnect();
              // console.log("Video opened.");
              this.init();
            }
          }).observe(this.#player, {
            attributes: true,
          });
        }
      }).observe(this.#player, {
        attributes: true,
      });
    }

    // Auto hide next up cardで縁取りを有効にしている場合に、オプションボタンのスタイルを調整
    #tweakOptionBtnStyle() {
      const existsStyleForOutlines = !!document.querySelector(
        "#addOutlinesForIcons"
      );
      if (!existsStyleForOutlines) {
        return;
      }
      if (document.querySelector("#addOutlinesForIcons_SpeedResetter")) {
        return;
      }
      const css = `
      .ext${RANDOM}-opt-btn-container img {
        filter: sepia(100%) saturate(2000%) hue-rotate(-10deg) drop-shadow(0 0 0.015em black) drop-shadow(0 0 0.015em black) drop-shadow(0 0 0.015em black) !important;
      }
    `;
      addStyle(css, "addOutlinesForIcons_SpeedResetter");
    }

    init() {
      this.#initControlVideoSpeedStates();
      this.#video.addEventListener("timeupdate", this.#identifyMetadata);
      this.#detectOpenClose();
      setTimeout(() => {
        this.#tweakOptionBtnStyle();
      }, 3000);
    }
  }

  const main = () => {
    if (!localStorage.getItem("speed-resetter-ext")) {
      saveDefaultOptions();
    }

    const scriptInfo = getScriptInfo();
    updateOptionVersion(scriptInfo);

    const options = getOptions();

    let isFirstPlayer = true;
    new MutationObserver((_) => {
      const players = document.querySelectorAll(
        `[id*='dv-web-player']:not([data-detected-from-ext${RANDOM}='true'])`
      );
      players.forEach((player) => {
        player.dataset[`detectedFromExt${RANDOM}`] = "true";
        new MutationObserver((_, observer) => {
          const video = player.querySelector("video");
          if (!video?.checkVisibility()) {
            return;
          }
          observer.disconnect();

          if (isFirstPlayer) {
            isFirstPlayer = false;
            try {
              createOptionDialog(scriptInfo.scriptVersion);
            } catch (e) {
              console.log(e);
            }
          }

          try {
            createOptionBtn(player);
          } catch (e) {
            console.log(e);
          }

          const speedResetter = new SpeedResetter(player, video, options);

          try {
            speedResetter.init();
          } catch (e) {
            console.log(e);
          }
        }).observe(player, { childList: true, subtree: true });
      });
    }).observe(document, { childList: true, subtree: true });
  };

  main();

})();
