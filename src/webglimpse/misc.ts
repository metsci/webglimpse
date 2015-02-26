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


    export function newGroupPainter( ...painters : Painter[] ) : Painter {
        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
            for ( var n = 0; n < painters.length; n++ ) {
                painters[ n ]( gl, viewport );
            }
        };
    }

    
    export function newBlendingBackgroundPainter( color : Color ) : Painter {
        
        var program = new Program( xyNdc_VERTSHADER, solid_FRAGSHADER );
        var u_Color = new UniformColor( program, 'u_Color' );
        var a_XyNdc = new Attribute( program, 'a_XyNdc' );
        
        var numVertices = 4;
        var xy_NDC = new Float32Array( 2*numVertices );
        var xyBuffer_NDC = newDynamicBuffer( );
        
        return function( gl : WebGLRenderingContext ) {
            if ( color.a >= 1 ) {
                gl.disable( GL.BLEND );
            }
            else {
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
            }
            
            program.use( gl );
            u_Color.setData( gl, color );
        
            xy_NDC[0] = -1;
            xy_NDC[1] =  1;
            xy_NDC[2] = -1;
            xy_NDC[3] = -1;
            xy_NDC[4] =  1;
            xy_NDC[5] =  1;
            xy_NDC[6] =  1;
            xy_NDC[7] = -1;
            
            xyBuffer_NDC.setData( xy_NDC );
            a_XyNdc.setDataAndEnable( gl, xyBuffer_NDC, 2, GL.FLOAT );

            gl.drawArrays( GL.TRIANGLE_STRIP, 0, numVertices );

            a_XyNdc.disable( gl );
            program.endUse( gl );
        };
    }
    

    export function newBackgroundPainter( color : Color ) : Painter {
        return function( gl : WebGLRenderingContext ) {
            gl.clearColor( color.r, color.g, color.b, color.a );
            gl.clear( GL.COLOR_BUFFER_BIT );
        };
    }


    export function newTexturePainter( texture : Texture2D, xFrac : number, yFrac : number, options : TextureDrawOptions ) {
        var textureRenderer = new TextureRenderer( );
        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
            textureRenderer.begin( gl, viewport );
            textureRenderer.draw( gl, texture, xFrac, yFrac, options );
            textureRenderer.end( gl );
        };
    }


    export function newSolidPane( color : Color ) : Pane {
        var pane = new Pane( null );
        pane.addPainter( newBackgroundPainter( color ) );
        return pane;
    }


    export function fitToTexture( texture : Texture2D ) {
        return function( parentPrefSize : Size ) {
            parentPrefSize.w = texture.w;
            parentPrefSize.h = texture.h;
        };
    }


    export function fixedSize( w : number, h : number ) {
        return function( parentPrefSize : Size ) {
            parentPrefSize.w = w;
            parentPrefSize.h = h;
        };
    }


    /**
     * Takes (x,y) in NDC (Normalized Device Coords), in attribute a_XyNdc
     */
    export var xyNdc_VERTSHADER = concatLines(
        '                                                ',
        '  attribute vec2 a_XyNdc;                       ',
        '                                                ',
        '  void main( ) {                                ',
        '      gl_Position = vec4( a_XyNdc, 0.0, 1.0 );  ',
        '  }                                             ',
        '                                                '
    );


    /**
     * Takes (x,y) as fractions of the viewport, in attribute a_XyFrac
     */
    export var xyFrac_VERTSHADER = concatLines(
        '                                                                ',
        '  attribute vec2 a_XyFrac;                                      ',
        '                                                                ',
        '  void main( ) {                                                ',
        '      gl_Position = vec4( ( -1.0 + 2.0*a_XyFrac ), 0.0, 1.0 );  ',
        '  }                                                             ',
        '                                                                '
    );


    export var solid_FRAGSHADER = concatLines(
        '                               ',
        '  precision lowp float;        ',
        '  uniform vec4 u_Color;        ',
        '                               ',
        '  void main( ) {               ',
        '      gl_FragColor = u_Color;  ',
        '  }                            ',
        '                               '
    );


    export var varyingColor_FRAGSHADER = concatLines(
        '                               ',
        '  precision lowp float;        ',
        '  varying vec4 v_Color;        ',
        '                               ',
        '  void main( ) {               ',
        '      gl_FragColor = v_Color;  ',
        '  }                            ',
        '                               '
    );


    export var modelview_VERTSHADER = concatLines(
        '    uniform mat4 u_modelViewMatrix;                       ',
        '    attribute vec4 a_Position;                            ',
        '                                                          ',
        '    void main( ) {                                        ',
        '        gl_Position = u_modelViewMatrix * a_Position ;    ',
        '    }                                                     ',
        '                                                          '
    );


    export var nearestPixelCenter_GLSLFUNC = concatLines(
        '                                                                    ',
        '  float nearestPixelCenter( float frac, float pixelSize ) {         ',
        '      return ( floor( frac*pixelSize + 1e-4 ) + 0.5 ) / pixelSize;  ',
        '  }                                                                 ',
        '                                                                    '
    );


    export enum Side {
        TOP, BOTTOM, RIGHT, LEFT
    }


    /**
     * Converts viewport-fraction to NDC (Normalized Device Coords)
     */
    export function fracToNdc( frac : number ) : number {
        return -1 + 2*frac;
    }


    export function nearestPixel( viewportFrac : number, viewportSize : number, imageAnchor : number, imageSize : number ) : number {
        var anchor = ( imageAnchor * imageSize ) % 1.0;
        return ( Math.floor( viewportFrac*viewportSize - anchor + 0.5 + 1e-4 ) + anchor ) / viewportSize;
    }


    export function putQuadXys( xys : Float32Array, index : number, xLeft : number, xRight : number, yTop : number, yBottom : number ) : number {
        var n = index;
        n = putUpperLeftTriangleXys( xys, n, xLeft, xRight, yTop, yBottom );
        n = putLowerRightTriangleXys( xys, n, xLeft, xRight, yTop, yBottom );
        return n;
    }


    export function putUpperLeftTriangleXys( xys : Float32Array, index : number, xLeft : number, xRight : number, yTop : number, yBottom : number ) : number {
        var n = index;
        xys[ n++ ] = xLeft;   xys[ n++ ] = yTop;
        xys[ n++ ] = xRight;  xys[ n++ ] = yTop;
        xys[ n++ ] = xLeft;   xys[ n++ ] = yBottom;
        return n;
    }


    export function putLowerRightTriangleXys( xys : Float32Array, index : number, xLeft : number, xRight : number, yTop : number, yBottom : number ) : number {
        var n = index;
        xys[ n++ ] = xLeft;   xys[ n++ ] = yBottom;
        xys[ n++ ] = xRight;  xys[ n++ ] = yTop;
        xys[ n++ ] = xRight;  xys[ n++ ] = yBottom;
        return n;
    }


    export function putUpperRightTriangleXys( xys : Float32Array, index : number, xLeft : number, xRight : number, yTop : number, yBottom : number ) : number {
        var n = index;
        xys[ n++ ] = xLeft;   xys[ n++ ] = yTop;
        xys[ n++ ] = xRight;  xys[ n++ ] = yTop;
        xys[ n++ ] = xRight;  xys[ n++ ] = yBottom;
        return n;
    }


    export function putLowerLeftTriangleXys( xys : Float32Array, index : number, xLeft : number, xRight : number, yTop : number, yBottom : number ) : number {
        var n = index;
        xys[ n++ ] = xLeft;   xys[ n++ ] = yBottom;
        xys[ n++ ] = xLeft;   xys[ n++ ] = yTop;
        xys[ n++ ] = xRight;  xys[ n++ ] = yBottom;
        return n;
    }


    export function putQuadRgbas( rgbas : Float32Array, index : number, color : Color ) : number {
        return putRgbas( rgbas, index, color, 6 );
    }


    export function putRgbas( rgbas : Float32Array, index : number, color : Color, count : number ) : number {
        var n = index;
        for ( var v = 0; v < count; v++ ) {
            rgbas[ n++ ] = color.r;  rgbas[ n++ ] = color.g;  rgbas[ n++ ] = color.b;  rgbas[ n++ ] = color.a;
        }
        return n;
    }


    export function clearSelection( ) {
        var selection = window.getSelection( );
        if ( selection ) {
            if ( selection[ 'removeAllRanges' ] ) {
                selection[ 'removeAllRanges' ]( );
            }
            else if ( selection[ 'empty' ] ) {
                selection[ 'empty' ]( );
            }
        }
    }


    export class SimpleModel<V> {
        private _value : V;
        private _changed : Notification;

        constructor( value : V = null ) {
            this._value = value;
            this._changed = new Notification( );
        }

        get value( ) : V { return this._value; }
        get changed( ) : Notification { return this._changed; }

        set value( value : V ) {
            if ( value !== this._value ) {
                this._value = value;
                this._changed.fire( );
            }
        }
    }


    export class XyModel {
        private _x : number;
        private _y : number;
        private _changed : Notification;

        constructor( x? : number, y? : number ) {
            this._x = x;
            this._y = y;
            this._changed = new Notification( );
        }

        get x( ) : number { return this._x; }
        get y( ) : number { return this._y; }
        get changed( ) : Notification { return this._changed; }

        set x( x : number ) {
            if ( x !== this._x ) {
                this._x = x;
                this._changed.fire( );
            }
        }

        set y( y : number ) {
            if ( y !== this._y ) {
                this._y = y;
                this._changed.fire( );
            }
        }

        setXy( x : number, y : number ) {
            if ( x !== this._x || y !== this._y ) {
                this._x = x;
                this._y = y;
                this._changed.fire( );
            }
        }
    }


}