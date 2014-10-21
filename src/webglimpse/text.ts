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


    interface Dim2D {
        w : number;
        h : number;
    }


    var textDim = ( function( ) {
        // Use div to figure out how big our texture needs to be
        var div = document.createElement( 'div' );
        div.style.setProperty( 'position', 'absolute' );
        div.style.setProperty( 'padding', '0' );
        div.style.setProperty( 'margin', '0' );
        div.style.setProperty( 'width', 'auto' );
        div.style.setProperty( 'height', 'auto' );
        div.style.setProperty( 'visibility', 'hidden' );

        return function( s : string, font : string ) : Dim2D {
            div.style.setProperty( 'font', font );
            div.textContent = s;

            document.body.appendChild( div );
            var width = div.clientWidth;
            var height = div.clientHeight;
            document.body.removeChild( div );

            return { w: width, h: height };
        };
    } )( );



    interface FontMetrics {
        jTop : number;
        jBaseline : number;
        jBottom : number;
    }


    function newFontMetricsCache( ) : Cache<FontMetrics> {
        return new Cache<FontMetrics>( {
            create: function( font : string ) : FontMetrics {

                var dim = textDim( 'fMgyj', font );
                var w = dim.w;
                var h = dim.h;
                var canvas = document.createElement( 'canvas' );
                canvas.width = w;
                canvas.height = h;
                var g = canvas.getContext( '2d' );

                g.font = font;
                g.textAlign = 'left';
                g.textBaseline = 'top';
                g.fillStyle = 'black';

                g.clearRect( 0, 0, w, h );
                g.fillText( 'fM', 0, 0 );
                var rgbaData = g.getImageData( 0, 0, w, h ).data;

                var jTop = -1;
                for ( var j = 0; j < h && jTop < 0; j++ ) {
                    for ( var i = 0; i < w && jTop < 0; i++ ) {
                        var alpha = rgbaData[ ( j*w + i )*4 + 3 ];
                        if ( alpha !== 0 ) jTop = j;
                    }
                }

                var jBaseline = -1;
                for ( var j = h-1; j >= 0 && jBaseline < 0; j-- ) {
                    for ( var i = 0; i < w && jBaseline < 0; i++ ) {
                        var alpha = rgbaData[ ( j*w + i )*4 + 3 ];
                        if ( alpha !== 0 ) jBaseline = j;
                    }
                }

                g.clearRect( 0, 0, w, h );
                g.fillText( 'gyj', 0, 0 );
                var rgbaData = g.getImageData( 0, 0, w, h ).data;

                var jBottom = -1;
                for ( var j = h-1; j >= 0 && jBottom < 0; j-- ) {
                    for ( var i = 0; i < w && jBottom < 0; i++ ) {
                        var alpha = rgbaData[ ( j*w + i )*4 + 3 ];
                        if ( alpha !== 0 ) jBottom = j;
                    }
                }

                return { jTop: jTop, jBaseline: jBaseline, jBottom: jBottom };
            },
            dispose: function( ) { }
        } );
    }


    var getRawFontMetrics = ( function( ) {
        var cache = newFontMetricsCache( );
        return function( font : string ) : FontMetrics {
            return cache.value( font );
        };
    } )( );


    var getTextWidth = ( function( ) {
        var canvas = document.createElement( 'canvas' );
        canvas.width = 1;
        canvas.height = 1;
        var g = canvas.getContext( '2d' );
        g.textAlign = 'left';
        g.textBaseline = 'top';
        return function( font : string, text : string ) : number {
            g.font = font;
            return g.measureText( text ).width;
        };
    } )( );


    export class TextTexture2D extends Texture2D {
        private _jBaseline : number;

        get jBaseline( ) : number { return this._jBaseline; }

        constructor( w : number, h : number, jBaseline : number, minFilter : number, magFilter : number, draw : ImageDrawer ) {
            super( w, h, minFilter, magFilter, draw );
            this._jBaseline = jBaseline;
        }

        yAnchor( textFrac : number ) {
            // Things tend to look the way you expect if textFrac is interpreted as
            // a fraction of the way from the bottom of the baseline pixel up to the
            // top of the top pixel
            //
            var bottom = this.jBaseline + 1;
            var h = this.h;
            return 1 - ( ( 1 - textFrac )*bottom / h );
        }
    }


    export function newTextTextureCache( font : string, color : Color ) : Cache<TextTexture2D> {
        var createTextTexture = createTextTextureFactory( font );
        return new Cache<TextTexture2D>( {
            create: function( text : string ) : TextTexture2D {
                return createTextTexture( color, text );
            },
            dispose: function( texture : Texture2D ) {
                texture.dispose( );
            }
        } );
    }


    export function newTextTextureCache2( font : string ) : TwoKeyCache<TextTexture2D> {
        var createTextTexture = createTextTextureFactory( font );
        return new TwoKeyCache<TextTexture2D>( {
            create: function( rgbaString : string, text : string ) : TextTexture2D {
                var color = parseRgba( rgbaString );
                return createTextTexture( color, text );
            },
            dispose: function( texture : Texture2D ) {
                texture.dispose( );
            }
        } );
    }


    export function newTextTextureCache3( ) : ThreeKeyCache<TextTexture2D> {
        return new ThreeKeyCache<TextTexture2D>( {
            create: function( font : string, rgbaString : string, text : string ) : TextTexture2D {
                var createTextTexture = createTextTextureFactory( font );
                var color = parseRgba( rgbaString );
                return createTextTexture( color, text );
            },
            dispose: function( texture : Texture2D ) {
                texture.dispose( );
            }
        } );
    }


    export interface TextTextureFactory {
        ( color : Color, text : string ) : TextTexture2D;
    }


    export function createTextTextureFactory( font : string ) : TextTextureFactory {
        var rawFontMetrics = getRawFontMetrics( font );
        var jBaseline = rawFontMetrics.jBaseline - rawFontMetrics.jTop;
        var h = rawFontMetrics.jBottom - rawFontMetrics.jTop + 1;

        return function( color : Color, text : string ) : TextTexture2D {
            var w = getTextWidth( font, text );

            return new TextTexture2D( w, h, jBaseline, GL.NEAREST, GL.NEAREST, function( g : CanvasRenderingContext2D ) {
                // Some browsers use hinting for canvas fillText! This behaves poorly on a transparent
                // background -- so we draw white text onto a black background, then infer alpha from
                // the pixel color (black = transparent, white = opaque).
                //
                // We compute alpha as (R+G+B)/3. This grayscales the image the browser drew, effectively
                // de-hinting it.
                //

                g.fillStyle = 'black';
                g.fillRect( 0, 0, w, h );

                g.font = font;
                g.textAlign = 'left';
                g.textBaseline = 'top';
                g.fillStyle = 'white';

                g.save( );
                g.translate( 0, -rawFontMetrics.jTop );
                g.fillText( text, 0, 0 );
                g.restore( );

                var r255 = 255 * color.r;
                var g255 = 255 * color.g;
                var b255 = 255 * color.b;
                var aFactor = color.a / 3;

                var pixels = g.getImageData( 0, 0, w, h );
                for ( var j = 0; j < pixels.height; j++ ) {
                    for ( var i = 0; i < pixels.width; i++ ) {
                        var pixelOffset = ( j*pixels.width + i )*4;
                        var a255 = aFactor * ( pixels.data[pixelOffset+0] + pixels.data[pixelOffset+1] + pixels.data[pixelOffset+2] );

                        pixels.data[ pixelOffset+0 ] = r255;
                        pixels.data[ pixelOffset+1 ] = g255;
                        pixels.data[ pixelOffset+2 ] = b255;
                        pixels.data[ pixelOffset+3 ] = a255;
                    }
                }

                g.putImageData( pixels, 0, 0 );
            } );
        }
    }








    export function newTextHintsCache( font : string ) : Cache<Texture2D> {
        var rawFontMetrics = getRawFontMetrics( font );
        var jBaseline = rawFontMetrics.jBaseline - rawFontMetrics.jTop;
        var h = rawFontMetrics.jBottom - rawFontMetrics.jTop + 1;

        return new Cache<Texture2D>( {

            create: function( text : string ) : Texture2D {
                var w = getTextWidth( font, text );

                // XXX: For now, assuming subpixels are horizontal-RGB

                // Draw text triple-sized, to get an alpha for each r,g,b subpixel
                var canvas3 = document.createElement( 'canvas' );
                canvas3.width = 3 * w;
                canvas3.height = h;
                var g3 = canvas3.getContext( '2d' );
                g3.fillStyle = 'black';
                g3.fillRect( 0, 0, canvas3.width, canvas3.height );

                g3.save( );
                g3.translate( 0, -rawFontMetrics.jTop );
                g3.scale( 3, 1 );
                g3.font = font;
                g3.textAlign = 'left';
                g3.textBaseline = 'top';
                g3.fillStyle = 'white';
                g3.fillText( text, 0, 0 );
                g3.restore( );
                var srcRgba = g3.getImageData( 0, 0, canvas3.width, canvas3.height ).data;

                return new Texture2D( w, h, GL.NEAREST, GL.NEAREST, function( g : CanvasRenderingContext2D ) {
                    var destImage = g.createImageData( w, h );
                    var destRgba = destImage.data;

                    var weightLeft = 1;
                    var weightCenter = 2;
                    var weightRight = 1;
                    var weightNorm = 1 / ( weightLeft + weightCenter + weightRight );

                    for ( var j = 0; j < h; j++ ) {
                        for ( var i = 0; i < w; i++ ) {
                            // Get alpha values for relevant src-pixels: one from just left of the dest-pixel, all
                            // three from inside the dest-pixel, and one from just right of the dest-pixel.
                            //
                            // Some browsers use hinting for canvas fillText! This behaves poorly on a transparent
                            // background -- so we draw white text onto a black background, then infer alpha from
                            // the pixel color (black = transparent, white = opaque).
                            //
                            // We compute alpha as (R+G+B)/3. This grayscales the image the browser drew, effectively
                            // de-hinting it so that we can re-hint it ourselves later (during blending, when the
                            // background color is known).
                            //
                            var srcPixelIndex = ( j*3*w + 3*i )*4;
                            var srcAlphaL = ( i > 0 ? ( srcRgba[srcPixelIndex-4] + srcRgba[srcPixelIndex-3] + srcRgba[srcPixelIndex-2] ) / ( 3 * 255 ) : 0 );
                            var srcAlpha0 = ( srcRgba[srcPixelIndex+0] + srcRgba[srcPixelIndex+1] + srcRgba[srcPixelIndex+2] ) / ( 3 * 255 );
                            var srcAlpha1 = ( srcRgba[srcPixelIndex+4] + srcRgba[srcPixelIndex+5] + srcRgba[srcPixelIndex+6] ) / ( 3 * 255 );
                            var srcAlpha2 = ( srcRgba[srcPixelIndex+8] + srcRgba[srcPixelIndex+9] + srcRgba[srcPixelIndex+10] ) / ( 3 * 255 );
                            var srcAlphaR = ( i < w-1 ? ( srcRgba[srcPixelIndex+12] + srcRgba[srcPixelIndex+13] + srcRgba[srcPixelIndex+14] ) / ( 3 * 255 ) : 0 );

                            // Weighted averages to find subpixel alphas
                            var alphaLeft   = weightNorm*( weightLeft*srcAlphaL + weightCenter*srcAlpha0 + weightRight*srcAlpha1 );
                            var alphaCenter = weightNorm*( weightLeft*srcAlpha0 + weightCenter*srcAlpha1 + weightRight*srcAlpha2 );
                            var alphaRight  = weightNorm*( weightLeft*srcAlpha1 + weightCenter*srcAlpha2 + weightRight*srcAlphaR );

                            // Store subpixel alphas in dest-pixel
                            var destPixelIndex = ( j*w + i )*4;
                            destRgba[ destPixelIndex + 0 ] = Math.round( 255 * alphaLeft   );
                            destRgba[ destPixelIndex + 1 ] = Math.round( 255 * alphaCenter );
                            destRgba[ destPixelIndex + 2 ] = Math.round( 255 * alphaRight  );

                            // Alpha will be used in computing final alpha of blended result -- use the average of
                            // the subpixel alphas
                            //
                            // If alpha is 1, Firefox will interpret it as 100%. Causes some pixels that should be
                            // very dim to come out very bright. As a workaround, nudge them down to zero.
                            //
                            var alphaAvg = Math.round( 255 * ( alphaLeft + alphaCenter + alphaRight ) / 3 );
                            destRgba[ destPixelIndex + 3 ] = ( alphaAvg === 1 ? 0 : alphaAvg );
                        }
                    }

                    g.putImageData( destImage, 0, 0 );
                } );
            },

            dispose: function( texture : Texture2D ) {
                texture.dispose( );
            }

        } );
    }


    export class HintedTextRenderer {

        private textRenderer_VERTSHADER = concatLines(
            '                                                                                                  ',
            '  uniform vec2 u_XyFrac;                                                                          ',
            '  uniform vec2 u_Anchor;                                                                          ',
            '  uniform vec2 u_ImageSize;                                                                       ',
            '  uniform vec2 u_ViewportSize;                                                                    ',
            '                                                                                                  ',
            '  attribute vec2 a_ImageFrac;                                                                     ',
            '                                                                                                  ',
            '  varying vec2 v_StCoord;                                                                         ',
            '                                                                                                  ',
            '  void main( ) {                                                                                  ',
            '      vec2 xy = -1.0 + 2.0*( u_XyFrac + u_ImageSize*( a_ImageFrac - u_Anchor )/u_ViewportSize );  ',
            '      gl_Position = vec4( xy, 0.0, 1.0 );                                                         ',
            '                                                                                                  ',
            '      v_StCoord = vec2( a_ImageFrac.x, 1.0 - a_ImageFrac.y );                                     ',
            '  }                                                                                               ',
            '                                                                                                  '
        );

        private textRenderer_FRAGSHADER = concatLines(
            '                                                                 ',
            '  precision mediump float;                                       ',
            '                                                                 ',
            '  uniform sampler2D u_Hints;                                     ',
            '  uniform float u_Alpha;                                         ',
            '                                                                 ',
            '  varying vec2 v_StCoord;                                        ',
            '                                                                 ',
            '  void main( ) {                                                 ',
            '      gl_FragColor = u_Alpha * texture2D( u_Hints, v_StCoord );  ',
            '  }                                                              ',
            '                                                                 '
        );


        private program : Program;
        private u_XyFrac : Uniform2f;
        private u_Anchor : Uniform2f;
        private u_ImageSize : Uniform2f;
        private u_ViewportSize : Uniform2f;
        private u_Alpha : Uniform1f;
        private u_Hints : UniformSampler2D;

        private a_ImageFrac : Attribute;
        private imageFracData : Buffer;

        private wViewport : number;
        private hViewport : number;


        constructor( ) {
            this.program = new Program( this.textRenderer_VERTSHADER, this.textRenderer_FRAGSHADER );
            this.u_XyFrac = new Uniform2f( this.program, 'u_XyFrac' );
            this.u_Anchor = new Uniform2f( this.program, 'u_Anchor' );
            this.u_ImageSize = new Uniform2f( this.program, 'u_ImageSize' );
            this.u_ViewportSize = new Uniform2f( this.program, 'u_ViewportSize' );
            this.u_Alpha = new Uniform1f( this.program, 'u_Alpha' );
            this.u_Hints = new UniformSampler2D( this.program, 'u_Hints' );

            this.a_ImageFrac = new Attribute( this.program, 'a_ImageFrac' );
            this.imageFracData = newStaticBuffer( new Float32Array( [ 0.0,0.0, 0.0,1.0, 1.0,0.0, 1.0,1.0 ] ) );

            this.wViewport = 0;
            this.hViewport = 0;
        }

        begin( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
            this.program.use( gl );
            this.u_ViewportSize.setData( gl, viewport.w, viewport.h );
            this.a_ImageFrac.setDataAndEnable( gl, this.imageFracData, 2, GL.FLOAT );

            this.wViewport = viewport.w;
            this.hViewport = viewport.h;
        }

        draw( gl : WebGLRenderingContext, hints : Texture2D, xFrac : number, yFrac : number, options? : { xAnchor? : number;
                                                                                                          yAnchor? : number;
                                                                                                          color?   : Color } ) {
            var xAnchor = ( hasval( options ) && hasval( options.xAnchor ) ? options.xAnchor : 0.5   );
            var yAnchor = ( hasval( options ) && hasval( options.yAnchor ) ? options.yAnchor : 0.5   );
            var color   = ( hasval( options ) && hasval( options.color   ) ? options.color   : black );

            // The hints texture stores subpixel alphas in its R,G,B components. For example, a red hint-pixel indicates
            // that, at that pixel, the final R component should be color.r (R_hint=1, so red is opaque), but the
            // final G and B components should be the G and B from the background pixel (G_hint=0, B_hint=0, so green
            // and blue are transparent).
            //
            // GL does not allow arbitrary blending, but we can use the blending options it does provide to get the effect
            // we want.
            //
            // There are 4 things to keep an eye on:
            //
            // 1. The RGB part of color, which is put into glBlendColor
            // 2. The A part of color, which is sent to the frag-shader (NOT passed to glBlendColor)
            // 3. The subpixel alphas, which are sent to the frag-shader in the hints-texture
            // 4. The glBlendFunc, which is set up in an unusual way
            //
            //
            // With this setup, we get:
            //
            //    R_final = ( R_frag )*R_foreground + ( 1 - R_frag )*R_background
            //    G_final = ( G_frag )*G_foreground + ( 1 - G_frag )*G_background
            //    B_final = ( B_frag )*B_foreground + ( 1 - B_frag )*B_background
            //    A_final = ( A_frag )*1            + ( 1 - A_frag )*A_background
            //
            // So R_frag, the output from the frag shader, is a weight that is used to take a weighted average between
            // foreground and background colors.
            //
            // The frag-shader is doing A_foreground*RGBA_hint. Conceptually, R_hint is really a subpixel alpha for the
            // red subpixel, so it is helpful to call it A_redhint (and analogously for G and B):
            //
            //    R_frag = A_foreground * A_redhint
            //    G_frag = A_foreground * A_greenhint
            //    B_frag = A_foreground * A_bluehint
            //
            // So the blended RGB is a weighted average of RGB_foreground and RGB_background, with a weighting factor of
            // ( A_foreground * A_subpixel ), where A_subpixel is either A_redhint, A_greenhint, or A_bluehint. Basically,
            // we have a separate alpha for each subpixel!
            //
            //
            // For the final alpha component, we want:
            //
            //    A_final = ( 1 - (1-A_background)*(1-A_frag) )
            //
            // A little algebra shows that to be equivalent to:
            //
            //    A_final = ( A_frag )*1 + ( 1 - A_frag )*A_background
            //
            // Which is exactly what we get, as long as we pass an alpha of 1 into glBlendColor.
            //
            //

            this.u_XyFrac.setData( gl, nearestPixel( xFrac, this.wViewport, xAnchor, hints.w ), nearestPixel( yFrac, this.hViewport, yAnchor, hints.h ) );
            this.u_Anchor.setData( gl, xAnchor, yAnchor );
            this.u_ImageSize.setData( gl, hints.w, hints.h );
            this.u_Alpha.setData( gl, color.a );
            this.u_Hints.setDataAndBind( gl, 0, hints );

            gl.enable( GL.BLEND );
            gl.blendColor( color.r, color.g, color.b, 1 );
            gl.blendFunc( GL.CONSTANT_COLOR, GL.ONE_MINUS_SRC_COLOR );

            gl.drawArrays( GL.TRIANGLE_STRIP, 0, 4 );
        }

        end( gl : WebGLRenderingContext ) {
            this.a_ImageFrac.disable( gl );
            this.u_Hints.unbind( gl );
            this.program.endUse( gl );
        }
    }


}