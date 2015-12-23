/*jshint strict:false, undef:false, unused:false */

var fontSizes = {
    1: 10,
    2: 13,
    3: 16,
    4: 18,
    5: 24,
    6: 32,
    7: 48
};

var spanToSemantic = {
    backgroundColor: {
        regexp: notWS,
        replace: function ( doc, colour ) {
            return createElement( doc, 'SPAN', {
                'class': 'rte-highlight',
                style: 'background-color:' + colour
            });
        }
    },
    color: {
        regexp: notWS,
        replace: function ( doc, colour ) {
            return createElement( doc, 'SPAN', {
                'class': 'rte-colour',
                style: 'color:' + colour
            });
        }
    } /*
    fontWeight: {
        regexp: /^bold/i,
        replace: function ( doc ) {
            return createElement( doc, 'B' );
        }
    },
    fontStyle: {
        regexp: /^italic/i,
        replace: function ( doc ) {
            return createElement( doc, 'I' );
        }
    },
    fontFamily: {
        regexp: notWS,
        replace: function ( doc, family ) {
            return createElement( doc, 'SPAN', {
                'class': 'font',
                style: 'font-family:' + family
            });
        }
    },
    fontSize: {
        regexp: notWS,
        replace: function ( doc, size ) {
            return createElement( doc, 'SPAN', {
                'class': 'size',
                style: 'font-size:' + size
            });
        }
    } */
};

var replaceWithTag = function ( tag ) {
    return function ( node, parent ) {
        var el = createElement( node.ownerDocument, tag );
        parent.replaceChild( el, node );
        el.appendChild( empty( node ) );
        return el;
    };
};

var attributeFilters = {

	style: function (elementName, element ) {
			var allowed = allowedStyles[elementName],
			removeStyle = [],
			style = element.style;
			if(! allowed || !style || style.length === 0){
				element.removeAttribute('style');
				return;
			}
			for(var s=0; s<style.length; s++){
				if(allowed.indexOf(style[s]) === -1){
					removeStyle.push(style[s]);
				}
			}
			for(var x=0; x<removeStyle.length; x++){
				style.removeProperty(removeStyle[x]);
			}

			if(style.length === 0){
				element.removeAttribute('style');
			}
	},
	'class': function (elementName, element) {
			var allowed = allowedClasses[elementName],
			required = requiredClasses[elementName],
			classesToRemove = [],
			classList = element.className.split(' ');
			if(! allowed){
				element.removeAttribute('class');
			}
			else if(classList) {
				for(var c=0; c<classList.length; c++){
					if(allowed.indexOf(classList[c]) === -1){
						classesToRemove.push(classList[c]);
					}
				}
				for(var x=0; x<classesToRemove.length; x++){
					removeClass(element, classesToRemove[x]);
				}
			}
			if(required){
				//add required classes, e.g. "OL" for ol tags:
				classList = element.className.split(' ') || [];
				for(var r=0; r<required.length; r++){
					if(classList.indexOf(required[r] === -1)){
						addClass(element, required[r]);
					}
				}
			}

			if(!element.className){
				element.removeAttribute('class');
			}
	}
};

var allowedStyles = {
	SPAN: ['background-color', 'color']
};

var allowedClasses = {
    SPAN: ['rte-highlight', 'rte-colour'],
    LI: ['rte-li'],
    UL: ['rte-ul'],
    OL: ['rte-ol']
};

var requiredClasses = {
	LI: ['rte-li'],
    UL: ['rte-ul'],
    OL: ['rte-ol']
};

var allowedAttributes = {
	SPAN: ['style', 'class'],
	IMG: ['src'],
	A: ['href']
};

var stylesRewriters = {
    SPAN: function ( span, parent ) {
        var style = span.style,
            doc = span.ownerDocument,
            attr, converter, css, newTreeBottom, newTreeTop, el;

        for ( attr in spanToSemantic ) {
            converter = spanToSemantic[ attr ];
            css = style[ attr ];
            if ( css && converter.regexp.test( css ) ) {
                el = converter.replace( doc, css );
                if ( newTreeBottom ) {
                    newTreeBottom.appendChild( el );
                }
                newTreeBottom = el;
                if ( !newTreeTop ) {
                    newTreeTop = el;
                }
            }
        }

        if ( newTreeTop ) {
            newTreeBottom.appendChild( empty( span ) );
            parent.replaceChild( newTreeTop, span );
        }

        return newTreeBottom || span;
    },
    STRONG: replaceWithTag( 'B' ),
    EM: replaceWithTag( 'I' ),
    STRIKE: replaceWithTag( 'S' ),
    FONT: function ( node, parent ) {
        var face = node.face,
            size = node.size,
            colour = node.color,
            doc = node.ownerDocument,
            fontSpan, sizeSpan, colourSpan,
            newTreeBottom, newTreeTop;
        if ( face ) {
            fontSpan = createElement( doc, 'SPAN', {
                'class': 'font',
                style: 'font-family:' + face
            });
            newTreeTop = fontSpan;
            newTreeBottom = fontSpan;
        }
        if ( size ) {
            sizeSpan = createElement( doc, 'SPAN', {
                'class': 'size',
                style: 'font-size:' + fontSizes[ size ] + 'px'
            });
            if ( !newTreeTop ) {
                newTreeTop = sizeSpan;
            }
            if ( newTreeBottom ) {
                newTreeBottom.appendChild( sizeSpan );
            }
            newTreeBottom = sizeSpan;
        }
        if ( colour && /^#?([\dA-F]{3}){1,2}$/i.test( colour ) ) {
            if ( colour.charAt( 0 ) !== '#' ) {
                colour = '#' + colour;
            }
            colourSpan = createElement( doc, 'SPAN', {
                'class': 'rte-colour',
                style: 'color:' + colour
            });
            if ( !newTreeTop ) {
                newTreeTop = colourSpan;
            }
            if ( newTreeBottom ) {
                newTreeBottom.appendChild( colourSpan );
            }
            newTreeBottom = colourSpan;
        }
        if ( !newTreeTop ) {
            newTreeTop = newTreeBottom = createElement( doc, 'SPAN' );
        }
        parent.replaceChild( newTreeTop, node );
        newTreeBottom.appendChild( empty( node ) );
        return newTreeBottom;
    },
    TT: function ( node, parent ) {
        var el = createElement( node.ownerDocument, 'SPAN', {
            'class': 'font',
            style: 'font-family:menlo,consolas,"courier new",monospace'
        });
        parent.replaceChild( el, node );
        el.appendChild( empty( node ) );
        return el;
    },
    P: replaceWithTag( 'DIV' ),
    H1: replaceWithTag( 'DIV'),
    H2: replaceWithTag( 'DIV'),
    H3: replaceWithTag( 'DIV'),
    H4: replaceWithTag( 'DIV'),
    H5: replaceWithTag( 'DIV'),
    H6: replaceWithTag( 'DIV')

};

var allowedBlock = /^(?:A(?:DDRESS|RTICLE|SIDE|UDIO)|BLOCKQUOTE|CAPTION|D(?:[DLT]|IV)|F(?:IGURE|IGCAPTION|OOTER)|H[1-6]|HEADER|L(?:ABEL|EGEND|I)|O(?:L|UTPUT)|P(?:RE)?|SECTION|T(?:BODY|FOOT|HEAD)|UL)$/;

var blockWhiteList = /^(?:DIV|SPAN|A|UL|OL|LI)$/;

var inlineWhiteList = /^(?:SPAN|A|B|BR|I|S|U|INPUT)$/;

var blacklist = /^(?:HEAD|META|STYLE)/;

var walker = new TreeWalker( null, SHOW_TEXT|SHOW_ELEMENT, function () {
    return true;
});

/*
    Two purposes:

    1. Remove nodes we don't want, such as weird <o:p> tags, comment nodes
       and whitespace nodes.
    2. Convert inline tags into our preferred format.
*/
var cleanTree = function cleanTree ( node ) {
    var children = node.childNodes,
        nonInlineParent, i, l, child, nodeName, nodeType, rewriter, childLength,
        startsWithWS, endsWithWS, data, sibling;

    nonInlineParent = node;
    while ( isInline( nonInlineParent ) ) {
        nonInlineParent = nonInlineParent.parentNode;
    }
    walker.root = nonInlineParent;

    for ( i = 0, l = children.length; i < l; i += 1 ) {
        child = children[i];
        nodeName = child.nodeName;
        nodeType = child.nodeType;
        rewriter = stylesRewriters[ nodeName ];
        if ( nodeType === ELEMENT_NODE ) {
            childLength = child.childNodes.length;
            if ( rewriter ) {
                child = rewriter( child, node );
            } else if ( blacklist.test( nodeName ) ) {
                node.removeChild( child );
                i -= 1;
                l -= 1;
                continue;
            } else if ( !blockWhiteList.test( nodeName ) && !isInline( child ) ) {
                i -= 1;
                l += childLength - 1;
                node.replaceChild( empty( child ), child );
                continue;
            } else if ( !inlineWhiteList.test ( nodeName ) && isInline( child ) ) {
            	i -= 1;
            	l += childLength -1;
            	node.replaceChild( empty( child ), child );
            	continue;
            }

            //Node has been accepted. Take care of attributes
            var attrsToRemove = [];
            var attrsToFilter = [];
            if(child.attributes) {
	            for(var a=0, attrs = child.attributes; a<attrs.length; a++) {
	            	if( attributeFilters[attrs[a].nodeName]){
	            		//taken care of later
	            		continue;
	            	}
	            	else if(allowedAttributes[nodeName]){
	            		if(allowedAttributes[nodeName].indexOf(attrs[a].nodeName) > -1) {
	            			continue;
	            		}
	            	}
	            	attrsToRemove.push(attrs[a].nodeName);
	            }

	            for(var x =0; x<attrsToRemove.length; x++ ) {
	            	child.removeAttribute(attrsToRemove[x]);
	            }

            }

            for(var filter in attributeFilters){
            	attributeFilters[filter](nodeName, child);
            }

            if ( childLength ) {
                cleanTree( child );
            }

        } else {
            if ( nodeType === TEXT_NODE ) {
                data = child.data;
                startsWithWS = !notWS.test( data.charAt( 0 ) );
                endsWithWS = !notWS.test( data.charAt( data.length - 1 ) );
                if ( !startsWithWS && !endsWithWS ) {
                    continue;
                }
                // Iterate through the nodes; if we hit some other content
                // before the start of a new block we don't trim
                if ( startsWithWS ) {
                    walker.currentNode = child;
                    while ( sibling = walker.previousPONode() ) {
                        nodeName = sibling.nodeName;
                        if ( nodeName === 'IMG' ||
                                ( nodeName === '#text' &&
                                    /\S/.test( sibling.data ) ) ) {
                            break;
                        }
                        if ( !isInline( sibling ) ) {
                            sibling = null;
                            break;
                        }
                    }
                    if ( !sibling ) {
                        data = data.replace( /^\s+/g, '' );
                    }
                }
                if ( endsWithWS ) {
                    walker.currentNode = child;
                    while ( sibling = walker.nextNode() ) {
                        if ( nodeName === 'IMG' ||
                                ( nodeName === '#text' &&
                                    /\S/.test( sibling.data ) ) ) {
                            break;
                        }
                        if ( !isInline( sibling ) ) {
                            sibling = null;
                            break;
                        }
                    }
                    if ( !sibling ) {
                        data = data.replace( /^\s+/g, '' );
                    }
                }
                if ( data ) {
                    child.data = data;
                    continue;
                }
            }
            node.removeChild( child );
            i -= 1;
            l -= 1;
        }
    }
    return node;
};

// ---

function removeClass( element, clazz ) {
	element.className = element.className.replace( new RegExp('(?:^|\\s)'+clazz+'(?!\\S)') ,'' );
}

function addClass( element, clazz ){
	if(element.className){
		element.className = element.className + ' ' + clazz;
	}
	else{
		element.className = '' + clazz;
	}
}

var removeEmptyInlines = function removeEmptyInlines ( root ) {
    var children = root.childNodes,
        l = children.length,
        child;
    while ( l-- ) {
        child = children[l];
        if ( child.nodeType === ELEMENT_NODE && !isLeaf( child ) ) {
            removeEmptyInlines( child );
            if ( isInline( child ) && !child.firstChild ) {
                root.removeChild( child );
            }
        } else if ( child.nodeType === TEXT_NODE && !child.data ) {
            root.removeChild( child );
        }
    }
};

// ---

var notWSTextNode = function ( node ) {
    return node.nodeType === ELEMENT_NODE ?
        node.nodeName === 'BR' :
        notWS.test( node.data );
};
var isLineBreak = function ( br ) {
    var block = br.parentNode,
        walker;
    while ( isInline( block ) ) {
        block = block.parentNode;
    }
    walker = new TreeWalker(
        block, SHOW_ELEMENT|SHOW_TEXT, notWSTextNode );
    walker.currentNode = br;
    return !!walker.nextNode();
};

// <br> elements are treated specially, and differently depending on the
// browser, when in rich text editor mode. When adding HTML from external
// sources, we must remove them, replacing the ones that actually affect
// line breaks by wrapping the inline text in a <div>. Browsers that want <br>
// elements at the end of each block will then have them added back in a later
// fixCursor method call.
proto.cleanupBRs = function ( root ) {
    var brs = root.querySelectorAll( 'BR' ),
        brBreaksLine = [],
        l = brs.length,
        i, br, parent;

    // Must calculate whether the <br> breaks a line first, because if we
    // have two <br>s next to each other, after the first one is converted
    // to a block split, the second will be at the end of a block and
    // therefore seem to not be a line break. But in its original context it
    // was, so we should also convert it to a block split.
    for ( i = 0; i < l; i += 1 ) {
        brBreaksLine[i] = isLineBreak( brs[i] );
    }
    while ( l-- ) {
        br = brs[l];
        // Cleanup may have removed it
        parent = br.parentNode;
        if ( !parent ) { continue; }
        // If it doesn't break a line, just remove it; it's not doing
        // anything useful. We'll add it back later if required by the
        // browser. If it breaks a line, wrap the content in div tags
        // and replace the brs.
        if ( !brBreaksLine[l] ) {
            detach( br );
        } else if ( !isInline( parent ) ) {
            this.fixContainer( parent );
        }
    }
};
