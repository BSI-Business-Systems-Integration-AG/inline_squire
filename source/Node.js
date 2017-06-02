/*jshint strict:false, undef:false, unused:false */

var inlineNodeNames  = /^(?:#text|A(?:BBR|CRONYM)?|B(?:R|D[IO])?|C(?:ITE|ODE)|D(?:ATA|EL|FN)|EM|FONT|HR|I(?:MG|NPUT|NS)?|KBD|Q|R(?:P|T|UBY)|S(?:AMP|MALL|PAN|TR(?:IKE|ONG)|U[BP])?|U|VAR|WBR)$/;

var leafNodeNames = {
    BR: 1,
    IMG: 1,
    INPUT: 1
},
proto = Squire.prototype;
//if nodes are the same, will return false, unless inclusive is set to true
function isChildOf(parent, child, inclusive) {
	inclusive = !!inclusive;
	var n = inclusive ? child : child.parentNode;

	while(n !== null){
		if(n === parent){
			return true;
		}
		n = n.parentNode;
	}
	return false;
}

function every ( nodeList, fn ) {
    var l = nodeList.length;
    while ( l-- ) {
        if ( !fn( nodeList[l] ) ) {
            return false;
        }
    }
    return true;
}

// ---

function hasTagAttributes ( node, tag, attributes ) {
    if ( node.nodeName !== tag ) {
        return false;
    }
    for ( var attr in attributes ) {
    	//<CUSTOMIZED>
        // Internet explorer seems to put a semicolon at the end of a style attribute,
        // even if we use setAttribute and the attribute contains no semicolon at all...
    	// Also, IE. seems to put an extra whitespace before the colon separating a
    	// style key and its value.
        var nodeAttr = node.getAttribute(attr),
        	queryAttr = attributes[attr];
        if(nodeAttr){
        	nodeAttr = nodeAttr.replace(/[;]$/, '');
        	nodeAttr = nodeAttr.replace(/\s*:\s*/, ':');
        }
        if (queryAttr){
        	queryAttr = queryAttr.replace(/[;]$/, '');
        	queryAttr = queryAttr.replace(/\s*:\s*/, ':');
        }
        if ( nodeAttr !== queryAttr ) {
            return false;
        }
        //</CUSTOMIZED>
    }
    return true;
}
function areAlike ( node, node2 ) {
    return !isLeaf( node ) && (
        node.nodeType === node2.nodeType &&
        node.nodeName === node2.nodeName &&
        node.className === node2.className &&
        ( ( !node.style && !node2.style ) ||
          node.style.cssText === node2.style.cssText )
    );
}

function isLeaf ( node ) {
    return node.nodeType === ELEMENT_NODE &&
        !!leafNodeNames[ node.nodeName ];
}
function isInline ( node ) {
    return inlineNodeNames.test( node.nodeName );
}
function isBlock ( node ) {
    var type = node.nodeType;
    return ( type === ELEMENT_NODE || type === DOCUMENT_FRAGMENT_NODE ) &&
        !isInline( node ) && every( node.childNodes, isInline );
}
function isContainer ( node ) {
    var type = node.nodeType;
    return ( type === ELEMENT_NODE || type === DOCUMENT_FRAGMENT_NODE ) &&
        !isInline( node ) && !isBlock( node );
}

function getBlockWalker ( node, self ) {
    var walker = new TreeWalker(
            self._body, SHOW_ELEMENT, isBlock, false );
    walker.currentNode = node;
    return walker;
}

function getPreviousBlock ( node, self ) {
    return getBlockWalker( node, self ).previousNode();
}
function getNextBlock ( node, self ) {
    return getBlockWalker( node, self ).nextNode();
}

proto.getNearest = function (node, tag, attributes ){
	do {
		if(! isChildOf(this._body, node)){
			return null;
		}
		if ( hasTagAttributes( node, tag, attributes ) ) {
            return node;
        }
	} while ( node = node.parentNode );
	return null;
};


function getPath ( node ) {
    var parent = node.parentNode,
        path, id, className, classNames, dir;
    if ( !parent || node.nodeType !== ELEMENT_NODE ) {
        path = parent ? getPath( parent ) : '';
    } else {
        path = getPath( parent );
        path += ( path ? '>' : '' ) + node.nodeName;
        if ( id = node.id ) {
            path += '#' + id;
        }
        if ( className = node.className.trim() ) {
            classNames = className.split( /\s\s*/ );
            classNames.sort();
            path += '.';
            path += classNames.join( '.' );
        }
        if ( dir = node.dir ) {
            path += '[dir=' + dir + ']';
        }
    }
    return path;
}

function getLength ( node ) {
    var nodeType = node.nodeType;
    return nodeType === ELEMENT_NODE ?
        node.childNodes.length : node.length || 0;
}

function detach ( node ) {
    var parent = node.parentNode;
    if ( parent ) {
        parent.removeChild( node );
    }
    return node;
}
function replaceWith ( node, node2 ) {
    var parent = node.parentNode;
    if ( parent ) {
        parent.replaceChild( node2, node );
    }
}
function empty ( node ) {
    var frag = node.ownerDocument.createDocumentFragment(),
        childNodes = node.childNodes,
        l = childNodes ? childNodes.length : 0;
    while ( l-- ) {
        frag.appendChild( node.firstChild );
    }
    return frag;
}

function createElement ( doc, tag, props, children ) {
    var el = doc.createElement( tag ),
        attr, value, i, l;
    if ( props instanceof Array ) {
        children = props;
        props = null;
    }
    if ( props ) {
        for ( attr in props ) {
            value = props[ attr ];
            if ( value !== undefined ) {
                el.setAttribute( attr, props[ attr ] );
            }
        }
    }
    if ( children ) {
        for ( i = 0, l = children.length; i < l; i += 1 ) {
            el.appendChild( children[i] );
        }
    }
    return el;
}

proto.fixCursor = function ( node ) {
    // In Webkit and Gecko, block level elements are collapsed and
    // unfocussable if they have no content. To remedy this, a <BR> must be
    // inserted. In Opera and IE, we just need a textnode in order for the
    // cursor to appear.
    var doc = node.ownerDocument,
        root = node,
        fixer, child;

    if ( node === this._body) {
        if ( !( child = node.firstChild ) || child.nodeName === 'BR' ) {
            fixer = this.createDefaultBlock();
            if ( child ) {
                node.replaceChild( fixer, child );
            }
            else {
                node.appendChild( fixer );
            }
            node = fixer;
            fixer = null;
        }
    }

    if ( isInline( node ) ) {
        child = node.firstChild;
        while ( cantFocusEmptyTextNodes && child &&
                child.nodeType === TEXT_NODE && !child.data ) {
            node.removeChild( child );
            child = node.firstChild;
        }
        if ( !child ) {
            if ( cantFocusEmptyTextNodes ) {
                fixer = doc.createTextNode( ZWS );
                this._didAddZWS();
            } else {
                fixer = doc.createTextNode( '' );
            }
        }
    } else {
        if ( useTextFixer ) {
            while ( node.nodeType !== TEXT_NODE && !isLeaf( node ) ) {
                child = node.firstChild;
                if ( !child ) {
                    fixer = doc.createTextNode( '' );
                    break;
                }
                node = child;
            }
            if ( node.nodeType === TEXT_NODE ) {
                // Opera will collapse the block element if it contains
                // just spaces (but not if it contains no data at all).
                if ( /^ +$/.test( node.data ) ) {
                    node.data = '';
                }
            } else if ( isLeaf( node ) ) {
                node.parentNode.insertBefore( doc.createTextNode( '' ), node );
            }
        }
        else if ( !node.querySelector( 'BR' ) ) {
            fixer = createElement( doc, 'BR' );
            while ( ( child = node.lastElementChild ) && !isInline( child ) ) {
                node = child;
            }
        }
    }
    if ( fixer ) {
        node.appendChild( fixer );
    }

    return root;
};

// Recursively examine container nodes and wrap any inline children.
proto.fixContainer = function ( container ) {
    var children = container.childNodes,
        doc = container.ownerDocument,
        wrapper = null,
        i, l, child, isBR,
        config = this._config;

    for ( i = 0, l = children.length; i < l; i += 1 ) {
        child = children[i];
        isBR = child.nodeName === 'BR';
        if ( !isBR && isInline( child ) ) {
            if ( !wrapper ) {
                 wrapper = createElement( doc,
                    config.blockTag, config.blockAttributes );
            }
            wrapper.appendChild( child );
            i -= 1;
            l -= 1;
        } else if ( isBR || wrapper ) {
            if ( !wrapper ) {
                wrapper = createElement( doc,
                    config.blockTag, config.blockAttributes );
            }
            this.fixCursor( wrapper );
            if ( isBR ) {
                container.replaceChild( wrapper, child );
            } else {
                container.insertBefore( wrapper, child );
                i += 1;
                l += 1;
            }
            wrapper = null;
        }
        if ( isContainer( child ) ) {
            this.fixContainer( child );
        }
    }
    if ( wrapper ) {
        container.appendChild( this.fixCursor( wrapper ) );
    }
    return container;
};

proto.split = function ( node, offset, stopNode ) {
    var nodeType = node.nodeType,
        parent, clone, next;
    if ( nodeType === TEXT_NODE && node !== stopNode ) {
        return this.split( node.parentNode, node.splitText( offset ), stopNode );
    }
    if ( nodeType === ELEMENT_NODE ) {
        if ( typeof( offset ) === 'number' ) {
            offset = offset < node.childNodes.length ?
                node.childNodes[ offset ] : null;
        }
        if ( node === stopNode ) {
            return offset;
        }

        // Clone node without children
        parent = node.parentNode;
        clone = node.cloneNode( false );

        // <CUSTOMIZED>
        if (clone.nodeName === 'TABLE') {
	        clone.id = generateTableId();
	    }
        // </CUSTOMIZED>

        // Add right-hand siblings to the clone
        while ( offset ) {
            next = offset.nextSibling;
            clone.appendChild( offset );
            offset = next;
        }

        // Maintain li numbering if inside a quote.
        if ( node.nodeName === 'OL' && this.getNearest( node, 'BLOCKQUOTE' ) ) {
            clone.start = ( +node.start || 1 ) + node.childNodes.length - 1;
        }

        // DO NOT NORMALISE. This may undo the fixCursor() call
        // of a node lower down the tree!

        // We need something in the element in order for the cursor to appear.
        this.fixCursor( node );
        this.fixCursor( clone );

        // Inject clone after original node
        if ( next = node.nextSibling ) {
            parent.insertBefore( clone, next );
        } else {
            parent.appendChild( clone );
        }

        // Keep on splitting up the tree
        return this.split( parent, clone, stopNode );
    }
    return offset;
};

function mergeInlines ( node, range ) {
    if ( node.nodeType !== ELEMENT_NODE ) {
        return;
    }
    var children = node.childNodes,
        l = children.length,
        frags = [],
        child, prev, len;
    while ( l-- ) {
        child = children[l];
        prev = l && children[ l - 1 ];
        if ( l && isInline( child ) && areAlike( child, prev ) &&
                !leafNodeNames[ child.nodeName ] ) {
            if ( range.startContainer === child ) {
                range.startContainer = prev;
                range.startOffset += getLength( prev );
            }
            if ( range.endContainer === child ) {
                range.endContainer = prev;
                range.endOffset += getLength( prev );
            }
            if ( range.startContainer === node ) {
                if ( range.startOffset > l ) {
                    range.startOffset -= 1;
                }
                else if ( range.startOffset === l ) {
                    range.startContainer = prev;
                    range.startOffset = getLength( prev );
                }
            }
            if ( range.endContainer === node ) {
                if ( range.endOffset > l ) {
                    range.endOffset -= 1;
                }
                else if ( range.endOffset === l ) {
                    range.endContainer = prev;
                    range.endOffset = getLength( prev );
                }
            }
            detach( child );
            if ( child.nodeType === TEXT_NODE ) {
                prev.appendData( child.data );
            }
            else {
                frags.push( empty( child ) );
            }
        }
        else if ( child.nodeType === ELEMENT_NODE ) {
            len = frags.length;
            while ( len-- ) {
                child.appendChild( frags.pop() );
            }
            mergeInlines( child, range );
        }
    }
}

function mergeWithBlock ( block, next, range ) {
    var container = next,
        last, offset, _range;
    while ( container.parentNode.childNodes.length === 1 ) {
        container = container.parentNode;
    }
    detach( container );

    offset = block.childNodes.length;

    // Remove extra <BR> fixer if present.
    last = block.lastChild;
    if ( last && last.nodeName === 'BR' ) {
        block.removeChild( last );
        offset -= 1;
    }

    _range = {
        startContainer: block,
        startOffset: offset,
        endContainer: block,
        endOffset: offset
    };

    block.appendChild( empty( next ) );
    mergeInlines( block, _range );

    range.setStart( _range.startContainer, _range.startOffset );
    range.collapse( true );

    // Opera inserts a BR if you delete the last piece of text
    // in a block-level element. Unfortunately, it then gets
    // confused when setting the selection subsequently and
    // refuses to accept the range that finishes just before the
    // BR. Removing the BR fixes the bug.
    // Steps to reproduce bug: Type "a-b-c" (where - is return)
    // then backspace twice. The cursor goes to the top instead
    // of after "b".
    if ( isPresto && ( last = block.lastChild ) && last.nodeName === 'BR' ) {
        block.removeChild( last );
    }
}

proto.mergeContainers = function ( node ) {
    var prev = node.previousSibling,
        first = node.firstChild,
        doc = node.ownerDocument,
        isListItem = ( node.nodeName === 'LI' ),
        needsFix, block;

    // <CUSTOMIZED>
    var isTableElement = ( node.nodeName === 'TABLE' || node.nodeName === 'TR' || node.nodeName === 'TD');
    if (isTableElement) {
    	return;
    }
    // </CUSTOMIZED>


    // Do not merge LIs, unless it only contains a UL
    if ( isListItem && ( !first || !/^[OU]L$/.test( first.nodeName ) ) ) {
        return;
    }

    if ( prev && areAlike( prev, node ) ) {
        if ( !isContainer( prev ) ) {
            if ( isListItem ) {
                block = createElement( doc, 'DIV' );
                block.appendChild( empty( prev ) );
                prev.appendChild( block );
            } else {
                return;
            }
        }
        detach( node );
        needsFix = !isContainer( node );
        prev.appendChild( empty( node ) );
        if ( needsFix ) {
            this.fixContainer( prev );
        }
        if ( first ) {
            this.mergeContainers( first );
        }
    } else if ( isListItem ) {
        prev = createElement( doc, 'DIV' );
        node.insertBefore( prev, first );
        this.fixCursor( prev );
    }
};
