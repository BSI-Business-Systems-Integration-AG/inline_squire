/*jshint ignore:start */

if ( typeof exports === 'object' ) {
    module.exports = Squire; //jshint ignore:line
} else if ( typeof define === 'function' && define.amd ) { //jshint ignore:line
    define( function () { //jshint ignore:line
        return Squire;
    });
} else {
    win.Squire = Squire;

    if ( top !== win &&
            doc.documentElement.getAttribute( 'data-squireinit' ) === 'true' ) {
        win.editor = new Squire( doc );
        if ( win.onEditorLoad ) {
            win.onEditorLoad( win.editor );
            win.onEditorLoad = null;
        }
    }
}

}( document ) );
