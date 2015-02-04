/*!
 * Webogram v0.3.9 - messaging web application for MTProto
 * https://github.com/zhukov/webogram
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * https://github.com/zhukov/webogram/blob/master/LICENSE
 */

'use strict';

/* EmojiHelper */

(function (global, emojis, categories, spritesheets) {


  var emojis = {};
  var shortcuts = {};
  var spritesheetPositions = {};
  var index = false;

  var popular = 'joy,kissing_heart,heart,heart_eyes,blush,grin,+1,relaxed,pensive,smile,sob,kiss,unamused,flushed,stuck_out_tongue_winking_eye,see_no_evil,wink,smiley,cry,stuck_out_tongue_closed_eyes,scream,rage,smirk,disappointed,sweat_smile,kissing_closed_eyes,speak_no_evil,relieved,grinning,yum,laughing,ok_hand,neutral_face,confused'.split(',');

  var i, j, code, shortcut, emoji, row, column, totalColumns;
  var len1, len2;

  for (i = 0, len1 = categories.length; i < len1; i++) {
    totalColumns = spritesheets[i][1];
    for (j = 0, len2 = categories[i].length; j < len2; j++) {
      code = categories[i][j];
      emoji = Config.Emoji[code];
      shortcut = emoji[1][0];
      emojis[code] = [emoji[0], shortcut];
      shortcuts[shortcut] = code;
      spritesheetPositions[code] = [i, j, Math.floor(j / totalColumns), j % totalColumns];
    }
  }

  function getPopularEmoji (callback) {
    ConfigStorage.get('emojis_popular', function (popEmojis) {
      var result = [];
      if (popEmojis && popEmojis.length) {
        for (var i = 0, len = popEmojis.length; i < len; i++) {
          result.push({code: popEmojis[i][0], rate: popEmojis[i][1]});
        }
        callback(result);
        return;
      };
      ConfigStorage.get('emojis_recent', function (recentEmojis) {
        recentEmojis = recentEmojis || popular || [];
        var shortcut, code;
        for (var i = 0, len = recentEmojis.length; i < len; i++) {
          shortcut = recentEmojis[i];
          if (Array.isArray(shortcut)) {
            shortcut = shortcut[0];
          }
          if (shortcut.charAt(0) == ':') {
            shortcut = shortcut.substr(1, shortcut.length - 2);
          }
          if (code = shortcuts[shortcut]) {
            result.push({code: code, rate: 1});
          }
        }
        callback(result);
      });
    });
  }

  function pushPopularEmoji (code) {
    getPopularEmoji(function (popularEmoji) {
      var exists = false;
      var count = popularEmoji.length;
      var result = [];
      for (var i = 0; i < count; i++) {
        if (popularEmoji[i].code == code) {
          exists = true;
          popularEmoji[i].rate++;
        }
        result.push([popularEmoji[i].code, popularEmoji[i].rate]);
      }
      if (exists) {
        result.sort(function (a, b) {
          return b[1] - a[1];
        });
      } else {
        if (result.length > 41) {
          result = result.slice(0, 41);
        }
        result.push([code, 1]);
      }
      ConfigStorage.set({emojis_popular: result});
    });
  }

  function indexEmojis () {
    if (index === false) {
      index = SearchIndexManager.createIndex();
      var shortcut;
      for (shortcut in shortcuts) {
        if (shortcuts.hasOwnProperty(shortcut)) {
          SearchIndexManager.indexObject(shortcuts[shortcut], shortcut, index);
        }
      }
    }
  }

  function searchEmojis (q) {
    indexEmojis();
    var foundObject = SearchIndexManager.search(q, index);
    var foundCodes = [];
    var code;
    for (code in foundObject) {
      if (foundObject.hasOwnProperty(code)) {
        foundCodes.push(code);
      }
    }
    return foundCodes;
  }

  global.EmojiHelper = {
    emojis: emojis,
    shortcuts: shortcuts,
    spritesheetPositions: spritesheetPositions,
    getPopularEmoji: getPopularEmoji,
    pushPopularEmoji: pushPopularEmoji,
    indexEmojis: indexEmojis,
    searchEmojis: searchEmojis
  };

})(window, Config.Emoji, Config.EmojiCategories, Config.EmojiCategorySpritesheetDimens);


function EmojiTooltip (btnEl, options) {
  options = options || {};
  var self = this;

  this.btnEl = $(btnEl);
  this.onEmojiSelected = options.onEmojiSelected;
  this.onStickerSelected = options.onStickerSelected;
  this.getStickers = options.getStickers;

  $(this.btnEl).on('mouseenter mouseleave', function (e) {
    self.isOverBtn = e.type == 'mouseenter';
    self.createTooltip();

    if (self.isOverBtn) {
      self.onMouseEnter(true);
    } else {
      self.onMouseLeave(true);
    }
  });
}

EmojiTooltip.prototype.onMouseEnter = function (triggerShow) {
  if (this.hideTimeout) {
    clearTimeout(this.hideTimeout);
    delete this.hideTimeout;
  }
  else if (triggerShow && !this.showTimeout) {
    this.showTimeout = setTimeout(this.show.bind(this), 500);
  }
};

EmojiTooltip.prototype.onMouseLeave = function (triggerUnshow) {
  if (!this.hideTimeout) {
    var self = this;
    this.hideTimeout = setTimeout(function () {
      self.hide();
    }, 500);
  }
  else if (triggerUnshow && this.showTimeout) {
    clearTimeout(this.showTimeout);
    delete this.showTimeout;
  }
};



EmojiTooltip.prototype.createTooltip = function () {
  if (this.tooltipEl) {
    return false;
  }

  var self = this;
  this.tooltipEl = $('<div class="composer_emoji_tooltip noselect"><div class="composer_emoji_tooltip_tabs"></div><div class="composer_emoji_tooltip_content clearfix"></div><div class="composer_emoji_tooltip_footer"><a class="composer_emoji_tooltip_settings"></a></div><i class="icon icon-tooltip-tail"></i></div>').appendTo(document.body);

  this.tabsEl = $('.composer_emoji_tooltip_tabs', this.tooltip);
  this.contentEl = $('.composer_emoji_tooltip_content', this.tooltip);
  this.footerEl = $('.composer_emoji_tooltip_footer', this.tooltip);
  this.settingsEl = $('.composer_emoji_tooltip_settings', this.tooltip);

  angular.forEach(['recent', 'smile', 'flower', 'bell', 'car', 'grid', 'stickers'], function (tabName, tabIndex) {
    $('<a class="composer_emoji_tooltip_tab composer_emoji_tooltip_tab_' + tabName + '"></a>')
      .on('mousedown', function (e) {
        self.selectTab(tabIndex);
        return cancelEvent(e);
      })
      .on('mouseenter mouseleave', function (e) {
        clearTimeout(self.selectTabTimeout);
        if (e.type == 'mouseenter') {
          self.selectTabTimeout = setTimeout(function () {
            self.selectTab(tabIndex);
          }, 300);
        }
      })
      .appendTo(self.tabsEl);
  });

  this.contentEl.on('mousedown', function (e) {
    e = e.originalEvent || e;
    var target = $(e.target), code, sticker;
    if (target.hasClass('emoji') || target.hasClass('composer_sticker_image')) {
      target = $(target[0].parentNode);
    }
    if (code = target.attr('data-code')) {
      if (self.onEmojiSelected) {
        self.onEmojiSelected(code);
      }
      EmojiHelper.pushPopularEmoji(code);
    }
    if (sticker = target.attr('data-sticker')) {
      if (self.onStickerSelected) {
        self.onStickerSelected(sticker);
      }
    }
    return cancelEvent(e);
  });

  this.tooltipEl.on('mouseenter mouseleave', function (e) {
    if (e.type == 'mouseenter') {
      self.onMouseEnter();
    } else {
      self.onMouseLeave();
    }
  });

  this.selectTab(0);

  return true;
}


EmojiTooltip.prototype.selectTab = function (tab) {
  if (this.tab === tab) {
    return false;
  }
  $('.active', this.tabsEl).removeClass('active');
  this.tab = tab;
  $(this.tabsEl[0].childNodes[tab]).addClass('active');

  this.updateTabContents();
};

EmojiTooltip.prototype.updateTabContents = function (tab) {
  var html = [];
  var self = this;
  var iconSize = Config.Mobile ? 26 : 20;

  if (this.tab == 6) { // Stickers
    var renderStickers = function (stickers) {
      var sticker, i;
      var count = stickers.length;
      for (i = 0; i < count; i++) {
        sticker = stickers[i];
        html.push('<a class="composer_sticker_btn" data-sticker="' + sticker.id + '"><img class="composer_sticker_image" src="' + encodeEntities(sticker.src) + '" /></a>');
      }
      self.contentEl.html(html.join(''));
    };
    this.getStickers(renderStickers);
  }
  else if (this.tab > 0) {
    var categoryIndex = this.tab - 1;
    var emoticonCodes = Config.EmojiCategories[categoryIndex];
    var totalColumns = Config.EmojiCategorySpritesheetDimens[categoryIndex][1];
    var count = emoticonCodes.length;
    var emoticonCode, emoticonData, i, x, y;

    for (i = 0; i < count; i++) {
      emoticonCode = emoticonCodes[i];
      emoticonData = Config.Emoji[emoticonCode];
      x = iconSize * (i % totalColumns);
      y = iconSize * Math.floor(i / totalColumns);
      html.push('<a class="composer_emoji_btn" title=":' + encodeEntities(emoticonData[1][0]) + ':" data-code="' + encodeEntities(emoticonCode) + '"><i class="emoji emoji-w20 emoji-spritesheet-' + categoryIndex + '" style="background-position: -' + x + 'px -' + y + 'px;"></i></a>');
    }
    this.contentEl.html(html.join(''));
  }
  else {
    EmojiHelper.getPopularEmoji(function (popularEmoji) {
      var emoticonCode, emoticonData, spritesheet, pos, categoryIndex;
      var count = popularEmoji.length;
      var i, x, y;

      for (i = 0; i < count; i++) {
        emoticonCode = popularEmoji[i].code;
        if (emoticonData = Config.Emoji[emoticonCode]) {
          spritesheet = EmojiHelper.spritesheetPositions[emoticonCode];
          categoryIndex = spritesheet[0];
          pos = spritesheet[1];
          x = iconSize * spritesheet[3];
          y = iconSize * spritesheet[2];
          html.push('<a class="composer_emoji_btn" title=":' + encodeEntities(emoticonData[1][0]) + ':" data-code="' + encodeEntities(emoticonCode) + '"><i class="emoji emoji-w20 emoji-spritesheet-' + categoryIndex + '" style="background-position: -' + x + 'px -' + y + 'px;"></i></a>');
        }
      }
      self.contentEl.html(html.join(''));
    });
  }
};

EmojiTooltip.prototype.updatePosition = function () {
  var offset = this.btnEl.offset();
  this.tooltipEl.css({top: offset.top, left: offset.left});
};

EmojiTooltip.prototype.show = function () {
  this.updatePosition();
  this.tooltipEl.show();
  delete this.showTimeout;
};

EmojiTooltip.prototype.hide = function () {
  this.tooltipEl.hide();
  delete this.hideTimeout;
};




function EmojiPanel (containerEl, options) {
  options = options || {};
  var self = this;

  this.containerEl = $(containerEl);
  this.onEmojiSelected = options.onEmojiSelected;

  this.containerEl.on('mousedown', function (e) {
    e = e.originalEvent || e;
    var target = $(e.target), code;
    if (target.hasClass('emoji')) {
      target = $(target[0].parentNode);
    }
    if (code = target.attr('data-code')) {
      if (self.onEmojiSelected) {
        self.onEmojiSelected(code);
      }
      EmojiHelper.pushPopularEmoji(code);
    }
    return cancelEvent(e);
  });

  this.update();
}

EmojiPanel.prototype.update = function () {
  var html = [];
  var self = this;
  var iconSize = Config.Mobile ? 26 : 20;

  EmojiHelper.getPopularEmoji(function (popularEmoji) {
    var emoticonCode, emoticonData, spritesheet, pos, categoryIndex;
    var count = popularEmoji.length;
    var i, x, y;

    for (i = 0; i < count; i++) {
      emoticonCode = popularEmoji[i].code;
      if (emoticonData = Config.Emoji[emoticonCode]) {
        spritesheet = EmojiHelper.spritesheetPositions[emoticonCode];
        categoryIndex = spritesheet[0];
        pos = spritesheet[1];
        x = iconSize * spritesheet[3];
        y = iconSize * spritesheet[2];
        html.push('<a class="composer_emoji_btn" title=":' + encodeEntities(emoticonData[1][0]) + ':" data-code="' + encodeEntities(emoticonCode) + '"><i class="emoji emoji-w20 emoji-spritesheet-' + categoryIndex + '" style="background-position: -' + x + 'px -' + y + 'px;"></i></a>');
      }
    }
    self.containerEl.html(html.join(''));
  });
}





function MessageComposer (textarea, options) {
  this.textareaEl = $(textarea);

  this.textareaEl.on('keyup keydown', this.onKeyEvent.bind(this));
  this.textareaEl.on('focus blur', this.onFocusBlur.bind(this));

  this.autoCompleteEl = $('<ul class="composer_dropdown dropdown-menu"></ul>').appendTo(document.body);

  var self = this;
  this.autoCompleteEl.on('mousedown', function (e) {
    e = e.originalEvent || e;
    var target = $(e.target), code;
    if (target.hasClass('emoji') || target.hasClass('composer_emoji_shortcut')) {
      target = $(target[0].parentNode);
    }
    if (code = target.attr('data-code')) {
      if (self.onEmojiSelected) {
        self.onEmojiSelected(code);
      }
      EmojiHelper.pushPopularEmoji(code);
    }
    return cancelEvent(e);
  });

  this.isActive = false;
}

MessageComposer.prototype.onKeyEvent = function (e) {
  var self = this;
  if (e.type == 'keyup') {
    this.checkAutocomplete();
  }
  if (e.type == 'keydown' && this.autocompleteShown) {
    if (e.keyCode == 38 || e.keyCode == 40) { // UP / DOWN
      var next = e.keyCode == 40;
      var currentSelected = $(this.autoCompleteEl).find('.composer_emoji_option_active');

      if (currentSelected.length) {
        var currentSelectedWrap = currentSelected[0].parentNode;
        var nextWrap = currentSelectedWrap[next ? 'nextSibling' : 'previousSibling'];
        currentSelected.removeClass('composer_emoji_option_active');
        if (nextWrap) {
          $(nextWrap).find('a').addClass('composer_emoji_option_active');
          return cancelEvent(e);
        }
      }

      var childNodes = this.autoCompleteEl[0].childNodes;
      var nextWrap = childNodes[next ? 0 : childNodes.length - 1];
      $(nextWrap).find('a').addClass('composer_emoji_option_active');

      return cancelEvent(e);
    }

    if (e.keyCode == 13) { // ENTER
      var currentSelected = $(this.autoCompleteEl).find('.composer_emoji_option_active') ||
                            $(this.autoCompleteEl).childNodes[0].find('a');
      var code = currentSelected.attr('data-code');
      if (code) {
        this.onEmojiSelected(code);
        EmojiHelper.pushPopularEmoji(code);
      }
      return cancelEvent(e);
    }
  }
}

MessageComposer.prototype.checkAutocomplete = function () {
  var textarea = this.textareaEl[0];
  var pos = getFieldSelection(textarea);
  var value = this.textareaEl[0].value.substr(0, pos);
  var matches = value.match(/:([A-Za-z_0-z\+-]*)$/);
  if (matches) {
    if (this.previousQuery == matches[0]) {
      return;
    }
    this.previousQuery = matches[0];
    var query = SearchIndexManager.cleanSearchText(matches[1]);
    if (query.length) {
      var found = EmojiHelper.searchEmojis(query);
      if (found.length) {
        this.showEmojiSuggestions(found);
      } else {
        this.hideSuggestions();
      }
    } else {
      EmojiHelper.getPopularEmoji((function (found) {
        this.showEmojiSuggestions(found);
      }).bind(this));
    }
  }
  else {
    delete this.previousQuery;
    this.hideSuggestions();
  }
}

MessageComposer.prototype.onFocusBlur = function (e) {
  this.isActive = e.type == 'focus';

  if (!this.isActive) {
    this.hideSuggestions();
  } else {
    setTimeout(this.checkAutocomplete.bind(this), 100);
  }
}

MessageComposer.prototype.onEmojiSelected = function (code) {
  console.log('emoji selected', code);

  var emoji = EmojiHelper.emojis[code];

  var textarea = this.textareaEl[0];
  var fullValue = textarea.value;
  var pos = this.isActive ? getFieldSelection(textarea) : fullValue.length;
  var suffix = fullValue.substr(pos);
  var prefix = fullValue.substr(0, pos);
  var matches = prefix.match(/:([A-Za-z_0-z\+-]*)$/);

  if (matches && matches[0]) {
    var newValue = prefix.substr(0, matches.index) + ':' + emoji[1] + ': ' + suffix;
    var newPos = matches.index + emoji[1].length + 3;
  } else {
    var newValue = prefix + ':' + emoji[1] + ': ' + suffix;
    var newPos = prefix.length + emoji[1].length + 3;
  }
  textarea.value = newValue;
  setFieldSelection(textarea, newPos);

  this.hideSuggestions();
}


MessageComposer.prototype.showEmojiSuggestions = function (codes) {
  var html = [];
  var iconSize = Config.Mobile ? 26 : 20;

  var emoticonCode, emoticonData, spritesheet, pos, categoryIndex;
  var count = Math.min(5, codes.length);
  var i, x, y;

  for (i = 0; i < count; i++) {
    emoticonCode = codes[i];
    if (emoticonCode.code) {
      emoticonCode = emoticonCode.code;
    }
    if (emoticonData = Config.Emoji[emoticonCode]) {
      spritesheet = EmojiHelper.spritesheetPositions[emoticonCode];
      categoryIndex = spritesheet[0];
      pos = spritesheet[1];
      x = iconSize * spritesheet[3];
      y = iconSize * spritesheet[2];
      html.push('<li><a class="composer_emoji_option" data-code="' + encodeEntities(emoticonCode) + '"><i class="emoji emoji-w20 emoji-spritesheet-' + categoryIndex + '" style="background-position: -' + x + 'px -' + y + 'px;"></i><span class="composer_emoji_shortcut">:' + encodeEntities(emoticonData[1][0]) + ':</span></a></li>');
    }
  }

  this.autoCompleteEl.html(html.join(''));
  this.autoCompleteEl.show();
  this.updatePosition();
  this.autocompleteShown = true;
}

MessageComposer.prototype.updatePosition = function () {
  var offset = this.textareaEl.offset();
  var height = this.autoCompleteEl.outerHeight();
  this.autoCompleteEl.css({top: offset.top - height, left: offset.left});
}

MessageComposer.prototype.hideSuggestions = function () {
  this.autoCompleteEl.hide();
  delete this.autocompleteShown;
}
