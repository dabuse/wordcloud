'use strict';

var SharerDialogView = function SharerDialogView(opts) {
  this.load(opts, {
    name: 'sharer-dialog',
    element: 'wc-sharer-dialog',
    titleElement: 'wc-sharer-title',
    imgElement: 'wc-sharer-img',
    imgLinkElement: 'wc-sharer-img-link',
    progressElement: 'wc-sharer-progress',
    titleInputElement: 'wc-sharer-title-input',
    captionInputElement: 'wc-sharer-caption',

    imgurStatusElement: 'wc-sharer-imgur-status',
    facebookStatusElement: 'wc-sharer-facebook-status',
    tumblrStatusElement: 'wc-sharer-tumblr-status',
    twitterStatusElement: 'wc-sharer-twitter-status',
    plurkStatusElement: 'wc-sharer-plurk-status',

    reUploadBtnElement: 'wc-sharer-reupload-btn',
    doneBtnElement: 'wc-sharer-done-btn'
  });

  this.imgLinkElement.addEventListener('click', this);

  this.imgurStatusElement.addEventListener('click', this);
  this.facebookStatusElement.addEventListener('click', this);
  this.tumblrStatusElement.addEventListener('click', this);
  this.twitterStatusElement.addEventListener('click', this);
  this.plurkStatusElement.addEventListener('click', this);

  this.doneBtnElement.addEventListener('click', this);
  this.reUploadBtnElement.addEventListener('click', this);

  this.imgElement.addEventListener('load', function sdv_imgLoaded(evt) {
    window.URL.revokeObjectURL(this.src);
  });

  if (!window.HTMLCanvasElement.prototype.toBlob) {
    // Load canvas-to-blob library to see if we could shim it.
    var el = document.createElement('script');
    el.src = './assets/canvas-to-blob/canvas-to-blob.min.js';
    document.documentElement.firstElementChild.appendChild(el);
  }

  this.stringIds = [
    'image-upload-not-supported',
    'share-text-only',
    'image-uploading',
    'waiting',
    'image-uploaded',
    'click-to-share',
    'image-upload-failed',
    'facebook-loading'
  ];
};
SharerDialogView.prototype = new View();
SharerDialogView.prototype.HASHTAG = '#HTML5WordCloud';
SharerDialogView.prototype.TWITTER_SHARE_URL =
  'https://twitter.com/home/?status=';
SharerDialogView.prototype.PLURK_SHARE_URL =
  'http://plurk.com/?status=';
SharerDialogView.prototype.FACEBOOK_PHOTO_URL =
  'https://www.facebook.com/photo.php?fbid=';
SharerDialogView.prototype.IMGUR_URL =
  'http://imgur.com/';
SharerDialogView.prototype.IMGUR_API_URL =
  'https://api.imgur.com/3/upload.json';
SharerDialogView.prototype.SHARED_ITEM_LIMIT = 10;
SharerDialogView.prototype.LABEL_IMAGE_UPLOAD_NOT_SUPPORTED = 0;
SharerDialogView.prototype.LABEL_SHARE_TEXT_ONLY = 1;
SharerDialogView.prototype.LABEL_IMAGE_UPLOADING = 2;
SharerDialogView.prototype.LABEL_WAITING = 3;
SharerDialogView.prototype.LABEL_IMAGE_UPLOADED = 4;
SharerDialogView.prototype.LABEL_CLICK_TO_SHARE = 5;
SharerDialogView.prototype.LABEL_IMAGE_UPLOAD_FAILED = 6;
SharerDialogView.prototype.LABEL_FACEBOOK_LOADING = 7;
SharerDialogView.prototype.beforeShow = function sdv_beforeShow() {
  (new FacebookSDKLoader()).load((function sdv_bindFacebookSDK() {
    if (this.facebookLoaded)
      return;

    this.facebookLoaded = true;

    FB.getLoginStatus(this.updateFacebookStatus.bind(this));
    FB.Event.subscribe(
      'auth.authResponseChange', this.updateFacebookStatus.bind(this));
  }).bind(this));

  this.uploadSupported = !!(window.HTMLCanvasElement.prototype.toBlob &&
    window.XMLHttpRequest && window.FormData);

  // XXX: To be replaced with text from fetcher
  this.titleInputElement.value = _('app-title');

  this.captionInputElement.value = (function getCloudList(list) {
    var list = this.app.data.list;
    var i = 0;
    var sharedItems = [];
    do {
      sharedItems[i] = list[i][0];
    } while (++i < this.SHARED_ITEM_LIMIT);

    return sharedItems.join(_('sep').replace(/"/g, '')) +
      ((list.length > this.SHARED_ITEM_LIMIT) ? _('frequent-terms-more') : '');
  }).call(this) + '\n\n' + this.HASHTAG;

  if (this.uploadSupported && !this.imgurData) {
    this.uploadImage();
  } else {
    this.updateUI();
  }
};
SharerDialogView.prototype.updateStatusElement =
  function sdv_updateStatusElement(el, stringId, href) {
    if (!href) {
      el.className = 'disabled';
      el.href = '';
    } else {
      el.className = '';
      el.href = href;
    }

    el.setAttribute('data-l10n-id', this.stringIds[stringId]);
    __(el);
  };
SharerDialogView.prototype.updateUI = function sdv_updateUI() {
  if (this.xhr) { // Uploading
    this.reUploadBtnElement.disabled = true;
    this.updateStatusElement(
      this.imgurStatusElement, this.LABEL_IMAGE_UPLOADING);
    this.updateStatusElement(
      this.facebookStatusElement, this.LABEL_WAITING);
    this.updateStatusElement(
      this.tumblrStatusElement, this.LABEL_WAITING);
    this.updateStatusElement(
      this.twitterStatusElement, this.LABEL_WAITING);
    this.updateStatusElement(
      this.plurkStatusElement, this.LABEL_WAITING);

  } else if (this.imgurData) { // Uploaded
    var imageUrl = this.imgurData.link;
    var imgurPageUrl = this.IMGUR_URL + this.imgurData.id;


    this.reUploadBtnElement.disabled = false;

    this.updateStatusElement(
      this.imgurStatusElement, this.LABEL_IMAGE_UPLOADED, imgurPageUrl);
    if (this.facebookPhotoUrl) {
      this.updateStatusElement(
        this.facebookStatusElement,
        this.LABEL_IMAGE_UPLOADED, this.facebookPhotoUrl);
    } else if (this.facebookLoading) {
      this.updateStatusElement(
        this.facebookStatusElement, this.LABEL_FACEBOOK_LOADING);
    } else {
      this.updateStatusElement(
        this.facebookStatusElement, this.LABEL_CLICK_TO_SHARE, '#');
    }
    this.updateStatusElement(
      this.tumblrStatusElement, this.LABEL_CLICK_TO_SHARE, '#');
    this.updateStatusElement(
      this.twitterStatusElement, this.LABEL_CLICK_TO_SHARE, '#');
    this.updateStatusElement(
      this.plurkStatusElement, this.LABEL_CLICK_TO_SHARE, '#');

  } else { // text upload only
    this.reUploadBtnElement.disabled = true;
    if (this.uploadSupported) {
      this.updateStatusElement(
        this.imgurStatusElement, this.LABEL_IMAGE_UPLOAD_FAILED);
    } else {
      this.updateStatusElement(
        this.imgurStatusElement, this.LABEL_IMAGE_UPLOAD_NOT_SUPPORTED);
    }

    this.updateStatusElement(
      this.facebookStatusElement, this.LABEL_SHARE_TEXT_ONLY, '#');
    this.updateStatusElement(
      this.tumblrStatusElement, this.LABEL_SHARE_TEXT_ONLY, '#');
    this.updateStatusElement(
      this.twitterStatusElement, this.LABEL_SHARE_TEXT_ONLY, '#');
    this.updateStatusElement(
      this.plurkStatusElement, this.LABEL_SHARE_TEXT_ONLY, '#');
  }
};
SharerDialogView.prototype.afterHide = function sdv_afterHide() {
  if (this.xhr) {
    this.xhr.abort();
    this.xhr = null;
  }
};
SharerDialogView.prototype.handleEvent = function sdv_handleEvent(evt) {
  if (evt.target.disabled || evt.target.className === 'disabled') {
    evt.preventDefault();
    return;
  }

  switch (evt.currentTarget) {
    case this.imgLinkElement:
      if (this.imgurData)
        break;

      evt.preventDefault();

      break;

    case this.facebookStatusElement:
      if (this.facebookPhotoUrl)
        break;

      this.share('facebook');
      evt.preventDefault();

      break;

    case this.tumblrStatusElement:
      this.share('tumblr');
      evt.preventDefault();

      break;

    case this.twitterStatusElement:
      this.share('twitter');
      evt.preventDefault();

      break;

    case this.plurkStatusElement:
      this.share('plurk');
      evt.preventDefault();

      break;

    case this.reUploadBtnElement:
      this.uploadImage();

      break;

    case this.doneBtnElement:
      this.close();
      break;
  }
};
SharerDialogView.prototype.close = function sdv_close() {
  this.app.switchUIState(this.app.UI_STATE_DASHBOARD);
};
SharerDialogView.prototype.getCanvasBlob = function sdv_getCanvasBlob(cb) {
  this.app.views['canvas'].element.toBlob(cb.bind(this));
};
SharerDialogView.prototype.updateProgress =
  function sdv_updateProgress(progress, active) {
    this.progressElement.style.width = Math.floor(progress * 100) + '%';
    this.progressElement.parentNode.className =
      'progress progress-striped' + (active ? ' active' : '');
  };
SharerDialogView.prototype.share = function sdv_share(type) {
  if (this.imgurData) {
    this.shareImage(type);
  } else {
    this.shareText(type);
  }
};
SharerDialogView.prototype.shareText = function sdv_shareText(type) {
  this.app.logAction('SharerDialogView::shareText', type);

  var url = window.location.href;
  switch (type) {
    case 'facebook':
      // Load Facebook SDK at this point;
      // We won't wrap other FB.xxx calls in other functions
      // because this is the only entry point for FacebookPanelView.
      (new FacebookSDKLoader()).load((function sdv_bindFacebookSDK() {
        // XXX This will be blocked by pop-up blocker.
        FB.ui({
          method: 'feed',
          link: url,
          name: this.titleInputElement.value,
          description: this.captionInputElement.value,
          display: 'iframe'
        });
      }).bind(this));
      break;

    case 'plurk':
      window.open(this.PLURK_SHARE_URL +
        encodeURIComponent(
          url + ' (' +
          this.titleInputElement.value + ') ' +
          this.captionInputElement.value + ' ' +
          this.HASHTAG));
      break;

    case 'twitter':
      window.open(this.TWITTER_SHARE_URL +
        encodeURIComponent(
          url + ' ' +
          this.titleInputElement.value + ' ' +
          this.captionInputElement.value + ' ' +
          this.HASHTAG));
      break;

    case 'tumblr':
      window.open('http://www.tumblr.com/share/link?=description=' +
         encodeURIComponent(this.captionInputElement.value) +
         '&name=' + encodeURIComponent(this.titleInputElement.value) +
         '&url=' + encodeURIComponent(url));
      this.close();

    default:
      throw 'Unknown shareDialogView type ' + type;
  }
};
SharerDialogView.prototype.updateFacebookStatus =
  function sdv_updateFacebookStatus(res) {
    if (res.status === 'connected') {
      FB.api('/me/permissions', (function checkPermissions(res) {
        this.hasFacebookPermission = (res.data[0]['publish_stream'] == 1);
        this.updateUI();
      }).bind(this));
    } else {
      this.hasFacebookPermission = false;
    }
    this.updateUI();
  };
SharerDialogView.prototype.uploadImage = function sdv_uploadImage() {
  if (!window.IMGUR_CLIENT_ID)
    throw 'IMGUR_CLIENT_ID is not set.';

  this.app.logAction('SharerDialogView::uploadImage');

  this.imgurData = undefined;
  this.facebookPhotoUrl = undefined;
  this.imgLinkElement.href = '#';
  this.updateProgress(0.05, true);

  var formdata = new FormData();
  formdata.append('title', this.titleInputElement.value);
  formdata.append('name', 'wordcloud.png');
  formdata.append('description',
    this.captionInputElement.value + '\n\n' + window.location.href);

  var xhr = this.xhr = new XMLHttpRequest();
  xhr.open('POST', this.IMGUR_API_URL);
  xhr.setRequestHeader('Authorization', 'Client-ID ' + IMGUR_CLIENT_ID);

  if (xhr.upload) {
    xhr.upload.onprogress = (function sdv_xhrProgress(evt) {
      this.updateProgress(evt.loaded / evt.total, true);
    }).bind(this);
  } else {
    this.updateProgress(1, true);
  }

  xhr.onreadystatechange = (function sdv_xhrFinish(evt) {
    if (xhr.readyState !== XMLHttpRequest.DONE || this.xhr !== xhr)
      return;

    this.checkImgurCredits();

    this.xhr = null;
    var response;
    try {
      response = JSON.parse(xhr.responseText);
    } catch (e) {}

    var success = response ? response.success : false;
    if (!success) {
      // Upload failed

      if (response && response.status === 429) {
        // Additional message on rate limiting
        alert(_('imgur-limit-msg'));
      }

      this.app.logAction('SharerDialogView::uploadImage::failed',
        response ? response.status : 'N/A');

      this.updateProgress(0.05, false);
      this.updateUI();
      return;
    }

    // Upload succeed
    this.imgurData = response.data;
    this.imgLinkElement.href = this.IMGUR_URL + this.imgurData.id;

    this.app.logAction('SharerDialogView::uploadImage::success');

    this.updateProgress(1, false);
    this.updateUI();
  }).bind(this);

  this.updateUI();
  this.getCanvasBlob(function sdv_gotBlob(blob) {
    if (this.xhr !== xhr)
      return;

    this.imgElement.src = window.URL.createObjectURL(blob);
    this.imgLinkElement.removeAttribute('hidden');

    formdata.append('image', blob);
    xhr.send(formdata);
  });
};
SharerDialogView.prototype.shareImage = function sdv_shareImage(type) {
  this.app.logAction('SharerDialogView::shareImage2', type);

  var url = window.location.href;
  if (url.length > 128)
    url = url.replace(/#.*$/, '');

  switch (type) {
    case 'facebook':
      if (!this.hasFacebookPermission) {
        FB.login((function sdv_loggedIn(res) {
          // XXX: There is no way to cancel the login pop-up midway if
          // the user navigates away from the panel (or the source dialog).
          // We shall do some checking here to avoid accidently switches the UI.
          if (this.element.hasAttribute('hidden')) {
            this.app.logAction('SharerDialogView::facebook-login::cancelled');
            return;
          }

          this.app.logAction('SharerDialogView::facebook-login::success');

          if (res.status !== 'connected')
            return;

          // Note that we assume we have the permission already
          // if the user logged in through here.
          // We have to overwrite this here so FacebookFetcher
          // could confirm the permission.
          this.hasFacebookPermission = true;

          // Call ourselves again
          this.shareImage(type);

        }).bind(this), { scope: 'publish_stream' });

        return;
      }

      // XXX This is sad. We couldn't make a CORS XHR request
      // to Facebook Graph API to send our image directly,
      // so we ask Facebook to pull the image uploaded to Imgur.
      this.facebookLoading = true;
      this.updateUI();
      FB.api('/me/photos', 'post', {
        url: this.imgurData.link,
        message: this.titleInputElement.value + '\n\n' +
          this.captionInputElement.value + '\n\n' + url
      }, (function sdv_facebookImageUploaded(res) {
        this.facebookLoading = false;

        if (!res || !res.id) {
          this.updateUI();
          return;
        }

        this.facebookPhotoUrl = this.FACEBOOK_PHOTO_URL + res.id;
        this.updateUI();
      }).bind(this));

      break;

    case 'plurk':
      window.open(this.PLURK_SHARE_URL +
        encodeURIComponent(
          this.imgurData.link + ' ' +
          url + ' (' + this.titleInputElement.value + ') ' +
          this.captionInputElement.value + ' ' +
          this.HASHTAG));

      break;

    case 'twitter':
      window.open(this.TWITTER_SHARE_URL +
        encodeURIComponent(
          url + ' ' +
          this.titleInputElement.value + ' ' +
          this.captionInputElement.value + ' ' +
          this.imgurData.link + ' ' +
          this.HASHTAG));

      break;

    case 'tumblr':
      window.open('http://www.tumblr.com/share/photo?source=' +
         encodeURIComponent(this.imgurData.link) +
         '&caption=' + encodeURIComponent(
            this.titleInputElement.value + '\n' +
            this.captionInputElement.value) +
         '&clickthru=' + encodeURIComponent(url));

      break;

    default:
      throw 'Unknown shareDialogView type ' + type;
  }
};
SharerDialogView.prototype.checkImgurCredits =
  function sdv_checkImgurCredits() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.imgur.com/3/credits');
    xhr.setRequestHeader('Authorization', 'Client-ID ' + IMGUR_CLIENT_ID);
    xhr.onreadystatechange = (function sdv_xhrFinish(evt) {
      if (xhr.readyState !== XMLHttpRequest.DONE)
        return;

      var response;
      try {
        response = JSON.parse(xhr.responseText);
      } catch (e) {}

      if (!response || !response.success)
        return;

      this.imgurCreditsData = response.data;

      this.app.logAction(
        'SharerDialogView::checkImgurCredits::ClientRemaining',
        response.data.ClientRemaining);

    }).bind(this);

    xhr.send();
  };