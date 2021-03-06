/*jshint strict:false, undef:false, unused:false */

var onCut = function () {
	// <CUSTOMIZED>
	if (!this.enabled) {
		return;
	}
	// </CUSTOMIZED>

    // Save undo checkpoint
    var range = this.getSelection();
    var self = this;
    this._recordUndoState( range );
    this._getRangeAndRemoveBookmark( range );
    this.setSelection( range );
    setTimeout( function () {
        try {
            // If all content removed, ensure div at start of body.
            self._ensureBottomLine();
        } catch ( error ) {
            self.didError( error );
        }
    }, 0 );
};

var onPaste = function ( event ) {
	// <CUSTOMIZED>
	if (!this.enabled) {
		return;
	}
	// </CUSTOMIZED>

    var clipboardData = event.clipboardData,
        items = clipboardData && clipboardData.items,
        fireDrop = false,
        hasImage = false,
        plainItem = null,
        self = this,
        l, item, type, data;

    // Current HTML5 Clipboard interface
    // ---------------------------------
    // https://html.spec.whatwg.org/multipage/interaction.html

    if ( items ) {
        event.preventDefault();
        l = items.length;
        while ( l-- ) {
            item = items[l];
            type = item.type;
            if ( type === 'text/html' ) {
                /*jshint loopfunc: true */
                item.getAsString( function ( html ) {
                	// <CUSTOMIZED>
                	//try and match start/end fragment.
                    if(! html){
                      return;
                    }
                    var startFragment = "<!--StartFragment-->",
                    	endFragment = "<!--EndFragment-->",
                    	firstIndex = html.indexOf(startFragment),
                    	lastIndex = html.lastIndexOf(endFragment),
                    	extractedHtml = html;

                    if(firstIndex > -1 && lastIndex > -1) {
                      extractedHtml = html.substring(firstIndex + startFragment.length, lastIndex);
                    }

                    self.fireEvent('requestHtmlPaste', {
                      rawHtml: extractedHtml
                    });

                    //self.insertHTML( html, true );
                	// </CUSTOMIZED>
                });
                /*jshint loopfunc: false */
                return;
            }
            if ( type === 'text/plain' ) {
                plainItem = item;
            }
            if ( /^image\/.*/.test( type ) ) {
                hasImage = true;
            }
        }
        // Treat image paste as a drop of an image file.
        if ( hasImage ) {
            this.fireEvent( 'dragover', {
                dataTransfer: clipboardData,
                /*jshint loopfunc: true */
                preventDefault: function () {
                    fireDrop = true;
                }
                /*jshint loopfunc: false */
            });
            if ( fireDrop ) {
                this.fireEvent( 'drop', {
                    dataTransfer: clipboardData
                });
            }
        } else if ( plainItem ) {
            item.getAsString( function ( text ) {
                self.insertPlainText( text, true );
            });
        }
        return;
    }

    // Old interface
    // -------------

    // Safari (and indeed many other OS X apps) copies stuff as text/rtf
    // rather than text/html; even from a webpage in Safari. The only way
    // to get an HTML version is to fallback to letting the browser insert
    // the content. Same for getting image data. *Sigh*.
    if ( clipboardData && (
            indexOf.call( clipboardData.types, 'text/html' ) > -1 || (
            indexOf.call( clipboardData.types, 'text/plain' ) > -1 &&
            indexOf.call( clipboardData.types, 'text/rtf' ) < 0 ) ) ) {
        event.preventDefault();
        // Abiword on Linux copies a plain text and html version, but the HTML
        // version is the empty string! So always try to get HTML, but if none,
        // insert plain text instead.
        if (( data = clipboardData.getData( 'text/html' ) )) {
        	// <CUSTOMIZED>
        	this.fireEvent('requestHtmlPaste', {
        		rawHtml: data
        	});
            //this.insertHTML( data, true );
        	// </CUSTOMIZED>
        } else if (( data = clipboardData.getData( 'text/plain' ) )) {
            this.insertPlainText( data, true );
        }
        return;
    }

    // No interface :(
    // ---------------

    this._awaitingPaste = true;

    var body = this._body,
        range = this.getSelection(),
        startContainer = range.startContainer,
        startOffset = range.startOffset,
        endContainer = range.endContainer,
        endOffset = range.endOffset,
        startBlock = getStartBlockOfRange( range, this );

    // We need to position the pasteArea in the visible portion of the screen
    // to stop the browser auto-scrolling.
    var pasteArea = this.createElement( 'DIV', {
        style: 'position: absolute; overflow: hidden; top:' +
            ( body.scrollTop +
                ( startBlock ? startBlock.getBoundingClientRect().top : 0 ) ) +
            'px; right: 150%; width: 1px; height: 1px;'
    });
    body.appendChild( pasteArea );
    range.selectNodeContents( pasteArea );
    this.setSelection( range );

    // A setTimeout of 0 means this is added to the back of the
    // single javascript thread, so it will be executed after the
    // paste event.
    setTimeout( function () {
        try {
            // IE sometimes fires the beforepaste event twice; make sure it is
            // not run again before our after paste function is called.
            self._awaitingPaste = false;

            // Get the pasted content and clean
            var html = '',
                next = pasteArea,
                first, range;

            // #88: Chrome can apparently split the paste area if certain
            // content is inserted; gather them all up.
            while ( pasteArea = next ) {
                next = pasteArea.nextSibling;
                detach( pasteArea );
                // Safari and IE like putting extra divs around things.
                first = pasteArea.firstChild;
                if ( first && first === pasteArea.lastChild &&
                        first.nodeName === 'DIV' ) {
                    pasteArea = first;
                }
                html += pasteArea.innerHTML;
            }

            range = self._createRange(
                startContainer, startOffset, endContainer, endOffset );
            self.setSelection( range );

            if ( html ) {
            	// <CUSTOMIZED>
            	self.fireEvent('requestHtmlPaste', {
            		rawHtml: html
            	});
                //self.insertHTML( html, true );
            	// </CUSTOMIZED>
            }
        } catch ( error ) {
            self.didError( error );
        }
    }, 0 );
};
