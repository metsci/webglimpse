/*
 * Copyright (c) 2014, Metron, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
module Webglimpse {


    export interface Painter {
        ( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable );
    }


    export interface PointerEvent {
        paneViewport : BoundsUnmodifiable;
        i : number;
        j : number;
        wheelSteps? : number;
        clickCount? : number;
        mouseEvent? : MouseEvent;
    }


    export function xFrac( ev : PointerEvent ) {
        return ev.paneViewport.xFrac( ev.i );
    }


    export function yFrac( ev : PointerEvent ) {
        return ev.paneViewport.yFrac( ev.j );
    }


    export interface LayoutEntry {
        layoutArg : any;
        layoutOptions : any;
        viewport : Bounds;
        prefSize : Size;
    }


    export interface LayoutPhase1 {
        ( parentPrefSize : Size, children : LayoutEntry[] );
    }


    export interface LayoutPhase2 {
        ( children : LayoutEntry[], parentViewport : BoundsUnmodifiable );
    }


    export interface Layout {
        updatePrefSize? : LayoutPhase1;
        updateChildViewports? : LayoutPhase2;
    }


    export interface Mask2D {
        ( viewport : BoundsUnmodifiable, i : number, j : number ) : boolean;
    }


    class PaneChild implements LayoutEntry {
        pane : Pane;
        layoutArg : any;
        layoutOptions : any;
        viewport : Bounds;
        scissor : Bounds;
        prefSize : Size;

        constructor( pane : Pane, layoutArg : any, layoutOptions : any ) {
            this.pane = pane;
            this.layoutArg = layoutArg;
            this.layoutOptions = layoutOptions;
            this.viewport = newBoundsFromRect( 0, 0, 0, 0 );
            this.scissor = newBoundsFromRect( 0, 0, 0, 0 );
            this.prefSize = { w: 0, h: 0 };
        }
    }


    export class Pane {
        private painters : Painter[];
        private consumesInputEvents : boolean;
        private isInside : Mask2D;

        private _mouseCursor : string;
        private _mouseCursorChanged : Notification;
        private _childMouseCursorListener : Listener;

        private children : OrderedSet<PaneChild>;
        private layout : Layout;
        private _viewport : Bounds;
        private _scissor : Bounds;
        private _viewportChanged : Notification;
        
        private _dispose : Notification;

        constructor( layout : Layout, consumesInputEvents : boolean = true, isInside : Mask2D = alwaysTrue ) {
            this.painters = [];
            this.consumesInputEvents = consumesInputEvents;
            this.isInside = isInside;

            this._mouseCursor = ( consumesInputEvents ? 'default' : null );
            this._mouseCursorChanged = new Notification( );
            this._childMouseCursorListener = ( ( ) => this._mouseCursorChanged.fire( ) );

            this.children = new OrderedSet<PaneChild>( [], (paneChild)=>getObjectId(paneChild.pane), false );
            this.layout = layout;
            this._viewport = newBoundsFromRect( 0, 0, 0, 0 );
            this._scissor = newBoundsFromRect( 0, 0, 0, 0 );
            this._viewportChanged = new Notification( );
            
            this._dispose = new Notification( );
            
            this._dispose.on( ( ) => {
                this._mouseUp.dispose( );
                this._mouseDown.dispose( );
                this._mouseMove.dispose( );
                this._mouseWheel.dispose( );
                this._mouseEnter.dispose( );
                this._mouseExit.dispose( );
                this._contextMenu.dispose( );
            
                // recursively dispose all child panes
                for ( var i = 0 ; i < this.children.length ; i++ ) {
                    this.children.valueAt( i ).pane.dispose.fire( );
                }
            } );
        }

        get mouseCursor( ) : string {
            return this._mouseCursor;
        }

        set mouseCursor( mouseCursor : string ) {
            if ( mouseCursor !== this._mouseCursor ) {
                this._mouseCursor = mouseCursor;
                this._mouseCursorChanged.fire( );
            }
        }

        get mouseCursorChanged( ) : Notification {
            return this._mouseCursorChanged;
        }

        addPainter( painter : Painter ) {
            this.painters.push( painter );
        }

        addPane( pane : Pane, layoutArg : any = null, layoutOptions : any = { } ) {
            this.children.add( new PaneChild( pane, layoutArg, layoutOptions ) );
            pane.mouseCursorChanged.on( this._childMouseCursorListener );
        }

        removePane( pane : Pane ) {
            this.children.removeValue( this._childFor( pane ) );
            pane.mouseCursorChanged.off( this._childMouseCursorListener );
        }

        layoutArg( pane : Pane ) : any {
            return this._childFor( pane ).layoutArg;
        }

        setLayoutArg( pane : Pane, layoutArg : any ) {
            this._childFor( pane ).layoutArg = layoutArg;
        }

        updateLayoutArgs( updateFn : (layoutArg:any,layoutOptions:any)=>any ) {
            for ( var c = 0; c < this.children.length; c++ ) {
                var child = this.children.valueAt( c );
                child.layoutArg = updateFn( child.layoutArg, child.layoutOptions );
            }
        }

        layoutOptions( pane : Pane ) : any {
            return this._childFor( pane ).layoutOptions;
        }

        private _childFor( pane : Pane ) : PaneChild {
            return this.children.valueFor( getObjectId( pane ) );
        }


        // Layout & Paint
        //

        updatePrefSizes( result : Size ) {
            // Child panes
            for ( var c = 0; c < this.children.length; c++ ) {
                var child = this.children.valueAt( c );
                child.pane.updatePrefSizes( child.prefSize );
            }
            // This pane
            if ( hasval( this.layout ) && hasval( this.layout.updatePrefSize ) ) {
                this.layout.updatePrefSize( result, this.children.toArray( ) );
            }
            else {
                result.w = null;
                result.h = null;
            }
        }

        updateBounds( viewport : BoundsUnmodifiable, scissor : BoundsUnmodifiable ) {
            // This pane
            var viewportChanged = ( viewport.iStart !== this._viewport.iStart || viewport.iEnd !== this._viewport.iEnd || viewport.jStart !== this._viewport.jStart || viewport.jEnd !== this._viewport.jEnd );
            this._viewport.setBounds( viewport );
            this._scissor.setBounds( scissor );
            // Child panes
            if ( hasval( this.layout ) && hasval( this.layout.updateChildViewports ) ) {
                this.layout.updateChildViewports( this.children.toArray( ), viewport );
                for ( var c = 0; c < this.children.length; c++ ) {
                    var child = this.children.valueAt( c );
                    child.scissor.setBounds( child.viewport.unmod );
                    child.scissor.cropToBounds( scissor );
                    child.pane.updateBounds( child.viewport.unmod, child.scissor.unmod );
                }
            }
            else if ( this.children.length > 0 ) {
                throw new Error( 'Pane has ' + this.children.length + ' ' + ( this.children.length === 1 ? 'child' : 'children' ) + ', but its layout is ' + this.layout );
            }
            // Notify
            if ( viewportChanged ) {
                this._viewportChanged.fire( );
            }
        }

        paint( gl : WebGLRenderingContext ) {
            var viewport = this._viewport.unmod;
            var scissor = this._scissor.unmod;
            if ( scissor.w > 0 && scissor.h > 0 ) {
                // This pane
                gl.viewport( viewport.i, viewport.j, viewport.w, viewport.h );
                gl.enable( GL.SCISSOR_TEST );
                gl.scissor( scissor.i, scissor.j, scissor.w, scissor.h );
                for ( var p = 0; p < this.painters.length; p++ ) {
                    this.painters[ p ]( gl, viewport );
                }
                // Child panes
                for ( var c = 0; c < this.children.length; c++ ) {
                    this.children.valueAt( c ).pane.paint( gl );
                }
            }
        }

        get viewport( ) : BoundsUnmodifiable {
            return this._viewport.unmod;
        }

        get scissor( ) : BoundsUnmodifiable {
            return this._scissor.unmod;
        }

        get viewportChanged( ) : Notification {
            return this._viewportChanged;
        }

        panesAt( i : number, j : number ) : Pane[] {
            var result : Pane[] = [ ];
            this._panesAt( i, j, result );
            return result;
        }

        private _panesAt( i : number, j : number, result : Pane[] ) : boolean {
            if ( this._scissor.contains( i, j ) ) {
                for ( var c = this.children.length-1; c >= 0; c-- ) {
                    var consumed = this.children.valueAt( c ).pane._panesAt( i, j, result );
                    if ( consumed ) return true;
                }
                if ( this.isInside( this._viewport.unmod, i, j ) ) {
                    result.push( this );
                    return this.consumesInputEvents;
                }
            }
            return false;
        }


        // Input Handling
        //

        private _mouseUp : Notification1<PointerEvent> = new Notification1<PointerEvent>( );
        private _mouseDown : Notification1<PointerEvent> = new Notification1<PointerEvent>( );
        private _mouseMove : Notification1<PointerEvent> = new Notification1<PointerEvent>( );
        private _mouseWheel : Notification1<PointerEvent> = new Notification1<PointerEvent>( );
        private _mouseEnter : Notification1<PointerEvent> = new Notification1<PointerEvent>( );
        private _mouseExit : Notification1<PointerEvent> = new Notification1<PointerEvent>( );
        private _contextMenu : Notification1<PointerEvent> = new Notification1<PointerEvent>( );

        get mouseUp( ) : Notification1<PointerEvent> { return this._mouseUp; }
        get mouseDown( ) : Notification1<PointerEvent> { return this._mouseDown; }
        get mouseMove( ) : Notification1<PointerEvent> { return this._mouseMove; }
        get mouseWheel( ) : Notification1<PointerEvent> { return this._mouseWheel; }
        get mouseEnter( ) : Notification1<PointerEvent> { return this._mouseEnter; }
        get mouseExit( ) : Notification1<PointerEvent> { return this._mouseExit; }
        get contextMenu( ) : Notification1<PointerEvent> { return this._contextMenu; }

        fireMouseUp( i : number, j : number, clickCount : number, mouseEvent : MouseEvent ) : any {
            return this._mouseUp.fire( { paneViewport: this._viewport.unmod, i: i, j: j, clickCount: clickCount, mouseEvent: mouseEvent } );
        }

        fireMouseDown( i : number, j : number, clickCount : number, mouseEvent : MouseEvent ) : any {
            return this._mouseDown.fire( { paneViewport: this._viewport.unmod, i: i, j: j, clickCount: clickCount, mouseEvent: mouseEvent } );
        }

        fireMouseMove( i : number, j : number, mouseEvent : MouseEvent ) : any {
            return this._mouseMove.fire( { paneViewport: this._viewport.unmod, i: i, j: j, mouseEvent: mouseEvent } );
        }

        fireMouseWheel( i : number, j : number, wheelSteps : number, mouseEvent : MouseEvent ) : any {
            return this._mouseWheel.fire( { paneViewport: this._viewport.unmod, i: i, j: j, wheelSteps: wheelSteps, mouseEvent: mouseEvent } );
        }

        fireMouseEnter( i : number, j : number, mouseEvent : MouseEvent ) : any {
            return this._mouseEnter.fire( { paneViewport: this._viewport.unmod, i: i, j: j, mouseEvent: mouseEvent } );
        }

        fireMouseExit( i : number, j : number, mouseEvent : MouseEvent ) : any {
            return this._mouseExit.fire( { paneViewport: this._viewport.unmod, i: i, j: j, mouseEvent: mouseEvent } );
        }

        fireContextMenu( i : number, j : number, mouseEvent : MouseEvent ) : any {
            return this._contextMenu.fire( { paneViewport: this._viewport.unmod, i: i, j: j, mouseEvent: mouseEvent } );
        }
        
        // Disposal
        //
                
        get dispose( ) : Notification {
            return this._dispose;
        }
    }


    export function requireGL( canvasElement : HTMLCanvasElement ) : WebGLRenderingContext {
        // Wrapping the getContext calls in try-catch blocks may lose information. However,
        // there are two reasons to do so:
        //
        //   1. We want to try 'experimental-webgl' even if 'webgl' throws an error
        //   2. Throwing a custom error should make it easy to show a helpful message
        //
        // Reason 2 is particularly important on Firefox, where the error thrown by getContext
        // has a completely uninformative message.
        //

        try {
            var glA = canvasElement.getContext( 'webgl' );
            if ( glA ) return glA;
        }
        catch ( e ) { }

        try {
            var glB = canvasElement.getContext( 'experimental-webgl' );
            if ( glB ) return glB;
        }
        catch ( e ) { }

        throw new Error( 'WebGLContextCreationError' );
    }


    function iMouse( element : HTMLElement, ev : MouseEvent ) : number {
        return ( ev.clientX - element.getBoundingClientRect( ).left );
    }


    function jMouse( element : HTMLElement, ev : MouseEvent ) : number {
        return ( element.clientHeight - ( ev.clientY - element.getBoundingClientRect( ).top ) );
    }


    function mouseWheelSteps( ev : MouseWheelEvent ) : number {
        // Firefox puts the scroll amount in the 'detail' field; everybody else puts it in 'wheelDelta'
        // Firefox uses positive values for a downward scroll; everybody else uses positive for upward
        var raw = ( ev.wheelDelta !== undefined ? ev.wheelDelta : -ev.detail );
        if ( raw > 0 ) { return -1; }
        if ( raw < 0 ) { return +1; }
        return 0;
    }


    function attachEventListeners( element : HTMLElement, contentPane : Pane ) {

        function detectEntersAndExits( oldPanes : Pane[], newPanes : Pane[], i : number, j : number, mouseEvent : MouseEvent ) {
            for ( var n = 0; n < oldPanes.length; n++ ) {
                oldPanes[ n ][ 'isHovered' ] = false;
            }
            for ( var n = 0; n < newPanes.length; n++ ) {
                newPanes[ n ][ 'isHovered' ] = true;
            }
            for ( var n = 0; n < oldPanes.length; n++ ) {
                var oldPane = oldPanes[ n ];
                if ( !oldPane[ 'isHovered' ] ) {
                    oldPane.fireMouseExit( i, j, mouseEvent );
                }
            }

            for ( var n = 0; n < newPanes.length; n++ ) {
                newPanes[ n ][ 'wasHovered' ] = false;
            }
            for ( var n = 0; n < oldPanes.length; n++ ) {
                oldPanes[ n ][ 'wasHovered' ] = true;
            }
            for ( var n = 0; n < newPanes.length; n++ ) {
                var newPane = newPanes[ n ];
                if ( !newPane[ 'wasHovered' ] ) {
                    newPane.fireMouseEnter( i, j, mouseEvent );
                }
            }
        }

        // Support for reporting click count. Browsers handle reporting single/double
        // clicks differently, so it's generally not a good idea to use both listeners
        // at one. That's why it's done this way instead of using the 'dblclick' event.
        var multiPressTimeout_MILLIS = 250;
        var prevPress_PMILLIS = 0;
        var clickCount = 1;

        var currentPanes : Pane[] = [];
        var currentMouseCursor : string = null;
        var dragging : boolean = false;
        var pendingExit : boolean = false;


        // Button presses for mouse events are reported differently in different browsers:
        // The results below are for the following browser versions:
        // Chrome Version 40.0.2214.94 (64-bit)
        // Firefox 35.0.1
        // IE 11.0.9600.17501
        //
        // ‘mousemove’ event with left mouse button down:
        //
        //                        Chrome                Firefox                  IE
        // MouseEvent.button      0                     0                        0
        // MouseEvent.buttons     undefined             1                        1
        // MouseEvent.which       1                     1                        1
        //
        //
        //                        Chrome                Firefox                  IE
        // MouseEvent.button      0                     0                        0
        // MouseEvent.buttons     undefined             0                        0
        // MouseEvent.which       0                     1                        1
        //
        //
        // For more info see: http://stackoverflow.com/questions/3944122/detect-left-mouse-button-press
        //
        function isLefMouseDown( ev : MouseEvent ) {
            if ( ev.buttons !== undefined ) {
                return ev.buttons === 1;
            }
            else {
                return ev.which === 1;
            }
        }

        function refreshMouseCursor( ) {
            var newMouseCursor = null;
            for ( var n = 0; n < currentPanes.length; n++ ) {
                newMouseCursor = currentPanes[ n ].mouseCursor;
                if ( hasval( newMouseCursor ) ) break;
            }
            if ( !hasval( newMouseCursor ) ) {
                newMouseCursor = 'default';
            }
            if ( newMouseCursor !== currentMouseCursor ) {
                element.style.cursor = newMouseCursor;
                currentMouseCursor = newMouseCursor;
            }
        }
        refreshMouseCursor( );
        contentPane.mouseCursorChanged.on( refreshMouseCursor );


        element.addEventListener( 'mousedown', function( ev : MouseEvent ) {
            if ( isLefMouseDown( ev ) ) {
                var press_PMILLIS = ( new Date( ) ).getTime( );
                var i = iMouse( element, ev );
                var j = jMouse( element, ev );

                if ( press_PMILLIS - prevPress_PMILLIS < multiPressTimeout_MILLIS ) {
                    clickCount++;
                }
                else {
                    clickCount = 1;
                }
                prevPress_PMILLIS = press_PMILLIS;

                var newPanes = contentPane.panesAt( i, j );
                detectEntersAndExits( currentPanes, newPanes, i, j, ev );
                currentPanes = newPanes;
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseDown( i, j, clickCount, ev );
                }
                refreshMouseCursor( );

                dragging = true;

                // Disable browser-default double-click action, which selects text and messes up subsequent drags
                ev.preventDefault( );
            }
        } );

        // Only want NON-DRAG moves from the canvas (e.g. we don't want moves that occur in an overlay div) -- so subscribe to CANVAS's mousemove
        element.addEventListener( 'mousemove', function( ev : MouseEvent ) {
            if ( !dragging ) {
                var i = iMouse( element, ev );
                var j = jMouse( element, ev );

                var newPanes = contentPane.panesAt( i, j );
                detectEntersAndExits( currentPanes, newPanes, i, j, ev );
                currentPanes = newPanes;
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
                refreshMouseCursor( );
            }
        } );

        // During a DRAG we want all move events, even ones that occur outside the canvas -- so subscribe to WINDOW's mousemove
        window.addEventListener( 'mousemove', function( ev : MouseEvent ) {
            if ( dragging ) {
                var i = iMouse( element, ev );
                var j = jMouse( element, ev );

                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
            }
        } );

        element.addEventListener( 'mouseout', function( ev : MouseEvent ) {
            var i = iMouse( element, ev );
            var j = jMouse( element, ev );

            if ( dragging ) {
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
                pendingExit = true;
            }
            else {
                detectEntersAndExits( currentPanes, [], i, j, ev );
                currentPanes = [];
                refreshMouseCursor( );
            }
        } );

        element.addEventListener( 'mouseover', function( ev : MouseEvent ) {
            var i = iMouse( element, ev );
            var j = jMouse( element, ev );

            if ( dragging ) {
                pendingExit = false;
            }
            else {
                var newPanes = contentPane.panesAt( i, j );
                detectEntersAndExits( currentPanes, newPanes, i, j, ev );
                currentPanes = newPanes;
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
                refreshMouseCursor( );
            }
        } );


        var endDrag = function( ev : MouseEvent ) {
            var i = iMouse( element, ev );
            var j = jMouse( element, ev );

            for ( var n = 0; n < currentPanes.length; n++ ) {
                currentPanes[ n ].fireMouseUp( i, j, clickCount, ev );
            }
            dragging = false;

            if ( pendingExit ) {
                detectEntersAndExits( currentPanes, [], i, j, ev );
                currentPanes = [];
                pendingExit = false;
                refreshMouseCursor( );
            }
            else {
                var newPanes = contentPane.panesAt( i, j );
                detectEntersAndExits( currentPanes, newPanes, i, j, ev );
                currentPanes = newPanes;
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
                refreshMouseCursor( );
            }
        };

        // The window always gets the mouse-up event at the end of a drag -- even if it occurs outside the browser window
        window.addEventListener( 'mouseup', function( ev : MouseEvent ) {
            if ( dragging && isLefMouseDown( ev ) ) {
                endDrag( ev );
            }
        } );

        // We don't receive mouse events that happen over another iframe -- even during a drag. If we miss a mouseup that
        // should terminate a drag, we end up stuck in dragging mode, which makes for a really lousy user experience. To
        // avoid that, whenever the mouse moves, check whether the button is down. If we're still in dragging mode, but
        // the button is now up, end the drag. 

        // If we're dragging, and we see a mousemove with no buttons down, end the drag
        var recentDrag : MouseEvent = null;
        var handleMissedMouseUp = function( ev : MouseEvent ) {
            if ( dragging ) {
                if ( !isLefMouseDown( ev ) && recentDrag ) {
                    var mouseUp = <MouseEvent> document.createEvent( 'MouseEvents' );
                    mouseUp.initMouseEvent( 'mouseup', true, true, window, 0, recentDrag.screenX, recentDrag.screenY, ev.screenX - window.screenX, ev.screenY - window.screenY, recentDrag.ctrlKey, recentDrag.altKey, recentDrag.shiftKey, recentDrag.metaKey, 0, null );
                    endDrag( mouseUp );
                }
                recentDrag = ev;
            }
        };
        window.addEventListener( 'mousemove', handleMissedMouseUp );
        var w = window;
        while ( w.parent !== w ) {
            try {
                w.parent.addEventListener( 'mousemove', handleMissedMouseUp );
                w = w.parent;
            }
            catch ( e ) {
                // Cross-origin security may prevent us from adding a listener to a window other than our own -- in that case,
                // the least bad option is to terminate drags on exit from the highest accessible window
                w.addEventListener( 'mouseout', function( ev : MouseEvent ) {
                    if ( dragging ) {
                        var mouseUp = <MouseEvent> document.createEvent( 'MouseEvents' );
                        mouseUp.initMouseEvent( 'mouseup', true, true, window, 0, ev.screenX, ev.screenY, ev.screenX - window.screenX, ev.screenY - window.screenY, ev.ctrlKey, ev.altKey, ev.shiftKey, ev.metaKey, 0, null );
                        endDrag( mouseUp );
                    }
                } );
                break;
            }
        }


        // Firefox uses event type 'DOMMouseScroll' for mouse-wheel events; everybody else uses 'mousewheel'
        var handleMouseWheel = function( ev : MouseWheelEvent ) {
            var i = iMouse( element, ev );
            var j = jMouse( element, ev );

            if ( dragging ) {
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
            }
            else {
                var newPanes = contentPane.panesAt( i, j );
                detectEntersAndExits( currentPanes, newPanes, i, j, ev );
                currentPanes = newPanes;
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
            }

            var wheelSteps = mouseWheelSteps( ev );
            for ( var n = 0; n < currentPanes.length; n++ ) {
                currentPanes[ n ].fireMouseWheel( i, j, wheelSteps, ev );
            }
        };
        element.addEventListener( 'mousewheel', handleMouseWheel );
        element.addEventListener( 'DOMMouseScroll', handleMouseWheel, false );

        element.addEventListener( 'contextmenu', function( ev : MouseEvent ) {
            var i = iMouse( element, ev );
            var j = jMouse( element, ev );

            if ( dragging ) {
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
            }
            else {
                var newPanes = contentPane.panesAt( i, j );
                detectEntersAndExits( currentPanes, newPanes, i, j, ev );
                currentPanes = newPanes;
                for ( var n = 0; n < currentPanes.length; n++ ) {
                    currentPanes[ n ].fireMouseMove( i, j, ev );
                }
                refreshMouseCursor( );
            }

            for ( var n = 0; n < currentPanes.length; n++ ) {
                currentPanes[ n ].fireContextMenu( i, j, ev );
            }

            // Disable browser-default context menu
            ev.preventDefault( );
        } );
    }


    export interface Drawable {
        setContentPane( pane : Pane );
        redraw( );
    }


    export function newDrawable( canvas : HTMLCanvasElement ) : Drawable {
        var contentPane : Pane = null;
        var contentPrefSize = { w: null, h: null };
        var contentViewport = newBoundsFromRect( 0, 0, 0, 0 );
        var gl = requireGL( canvas );
        var pendingRequestId = <number> null;
        return {
            setContentPane: function( pane : Pane ) {
                if ( hasval( contentPane ) ) {
                    // XXX: Detach listeners from old contentPane
                }
                contentPane = pane;
                attachEventListeners( canvas, contentPane );
            },
            redraw: function( ) {
                if ( !hasval( pendingRequestId ) ) {
                    pendingRequestId = window.requestAnimationFrame( function( ) {
                        if ( hasval( contentPane ) ) {
                            contentPane.updatePrefSizes( contentPrefSize );
                            contentViewport.setRect( 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );
                            contentPane.updateBounds( contentViewport.unmod, contentViewport.unmod );
                            contentPane.paint( gl );

                            // XXX: Trigger an enter/exit check somehow (fake a mouse-event?)
                        }
                        pendingRequestId = null;
                    } );
                }
            }
        };
    }


}
