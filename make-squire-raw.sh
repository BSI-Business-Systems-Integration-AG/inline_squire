#!/bin/bash
cat source/intro.js source/Constants.js source/TreeWalker.js source/Node.js source/Range.js source/KeyHandlers.js source/Clean.js source/Clipboard.js source/Editor.js source/outro.js | grep -v '^\/\*jshint' > build/squire-raw.js
cp build/squire-raw.js ../bsi-tools-scout/com.bsiag.scout.rt.ui.html/src/main/js/squire/squire-raw.js
