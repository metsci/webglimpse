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


    export class Label {
        private _font : string;
        private _color : Color;
        private _text : string;
        private _textureFactory : TextTextureFactory;
        private _texture : TextTexture2D;

        constructor( font? : string, color? : Color, text? : string ) {
            this._font = font;
            this._color = color;
            this._text = text;
        }

        get font( ) : string {
            return this._font;
        }

        set font( font : string ) {
            if ( this._font !== font ) {
                this._font = font;
                this._textureFactory = null;
                if ( this._texture ) {
                    this._texture.dispose( );
                    this._texture = null;
                }
            }
        }

        get color( ) : Color {
            return this._color;
        }

        set color( color : Color ) {
            if ( !sameColor( this._color, color ) ) {
                this._color = color;
                if ( this._texture ) {
                    this._texture.dispose( );
                    this._texture = null;
                }
            }
        }

        get text( ) : string {
            return this._text;
        }

        set text( text : string ) {
            if ( this._text !== text ) {
                this._text = text;
                if ( this._texture ) {
                    this._texture.dispose( );
                    this._texture = null;
                }
            }
        }

        get texture( ) : TextTexture2D {
            if ( !this._textureFactory ) {
                this._textureFactory = ( this._font ? createTextTextureFactory( this._font ) : null );
            }
            if ( !this._texture ) {
                this._texture = ( this._color && this._text ? this._textureFactory( this._color, this._text ) : null );
            }
            return this._texture;
        }
    }


    export function fitToLabel( label : Label ) {
        return function( parentPrefSize : Size ) {
            var texture = label.texture;
            parentPrefSize.w = ( texture ? texture.w : 0 );
            parentPrefSize.h = ( texture ? texture.h : 0 );
        };
    }


    export function newLabelPainter( label : Label, xFrac : number, yFrac : number, xAnchor? : number, yAnchor? : number, rotation_CCWRAD? : number ) {
        var textureRenderer = new TextureRenderer( );
        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
            var texture = label.texture;
            if ( texture ) {
                textureRenderer.begin( gl, viewport );
                textureRenderer.draw( gl, texture, xFrac, yFrac, { xAnchor: xAnchor, yAnchor: texture.yAnchor( yAnchor ), rotation_CCWRAD: rotation_CCWRAD } );
                textureRenderer.end( gl );
            }
        };
    }


}