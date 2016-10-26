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


    export function edgeMarks_VERTSHADER( labelSide : Side ) {
        // The shader uses 'a' for the along-axis coord, and 'b' for the across-axis coord
        var horizontal = ( labelSide === Side.TOP || labelSide === Side.BOTTOM );
        var bFlip = ( labelSide === Side.LEFT || labelSide === Side.BOTTOM );
        return concatLines(
            nearestPixelCenter_GLSLFUNC,
            '                                                                                               ',
            '  uniform float u_VMin;                                                                        ',
            '  uniform float u_VSize;                                                                       ',
            '  uniform vec2 u_ViewportSize;                                                                 ',
            '  uniform float u_MarkSize;                                                                    ',
            '                                                                                               ',
            '  attribute vec2 a_VCoord;                                                                     ',
            '                                                                                               ',
            '  void main( ) {                                                                               ',
            '      float aViewportSize = ' + ( horizontal ? 'u_ViewportSize.x' : 'u_ViewportSize.y' ) + ';  ',
            '      float aFrac = nearestPixelCenter( ( a_VCoord.x - u_VMin ) / u_VSize, aViewportSize );    ',
            '      float a = -1.0 + 2.0*( aFrac );                                                          ',
            '                                                                                               ',
            '      float bViewportSize = ' + ( horizontal ? 'u_ViewportSize.y' : 'u_ViewportSize.x' ) + ';  ',
            '      float bFrac = ( a_VCoord.y * u_MarkSize ) / bViewportSize;                               ',
            '      float b = ' + ( bFlip ? '-' : '' ) + '( -1.0 + 2.0*( bFrac ) );                         ',
            '                                                                                               ',
            '      gl_Position = vec4( ' + ( horizontal ? 'a,b' : 'b,a' ) + ', 0.0, 1.0 );                  ',
            '  }                                                                                            ',
            '                                                                                               '
        );
    }
    
    export var gradient_FRAGSHADER = concatLines(
        '                                 ',
        '  precision highp float;         ',
        '  uniform sampler2D u_colorTex;  ',
        '                                 ',
        '  varying vec2 v_texCoord;       ',
        '                                                                                   ',
        '  void main( ) {                                                                   ',
        '     vec4 color = texture2D( u_colorTex, v_texCoord );                             ',
        '     gl_FragColor = color;                                                         ',
        '     gl_FragColor.a = 1.0;                                                         ',
        '  }                                                                                '
    );

    // provides a custom labeler for axis tick marks
    //
    // value        : the tick value to create a label string for
    // axis         : the axis associated with the tick value
    // tickInterval : the requested spacing in pixels between ticks
    // precision    : number of decimal points which should be used for tick labels
    // orderAxis    : order( Math.abs( axis.vSize ) ) then rounded to nearest multiple of three (-3, 0, 3, 6...)
    // orderFactor  : Math.pow( 10, -orderAxis )
    export interface TickLabeler {
        ( value : number, axis : Axis1D, tickInterval : number ): string;
    }
    

    export interface EdgeAxisPainterOptions {
        tickSpacing? : number;
        label?       : string;
        units?       : string;
        shortenLabels? : boolean;
        font?        : string;
        textColor?   : Color;
        tickColor?   : Color;
        tickSize?    : number;
        showLabel?   : boolean;
        showBorder?  : boolean;
        gradientFill?: Gradient;
        tickLabeler? : TickLabeler;
    }


    export function newEdgeAxisPainter( axis : Axis1D, labelSide : Side, options? : EdgeAxisPainterOptions ) : Painter {
        var tickSpacing   = ( hasval( options ) && hasval( options.tickSpacing   ) ? options.tickSpacing   : 100   );
        var label         = ( hasval( options ) && hasval( options.label         ) ? options.label         : ''    );
        var units         = ( hasval( options ) && hasval( options.units         ) ? options.units         : ''    );
        var shortenLabels = ( hasval( options ) && hasval( options.shortenLabels ) ? options.shortenLabels : true );
        var font          = ( hasval( options ) && hasval( options.font          ) ? options.font          : '11px verdana,sans-serif' );
        var textColor     = ( hasval( options ) && hasval( options.textColor     ) ? options.textColor     : black );
        var tickColor     = ( hasval( options ) && hasval( options.tickColor     ) ? options.tickColor     : black );
        var tickSize      = ( hasval( options ) && hasval( options.tickSize      ) ? options.tickSize      : 6     );
        var showLabel     = ( hasval( options ) && hasval( options.showLabel     ) ? options.showLabel     : true  );
        var showBorder    = ( hasval( options ) && hasval( options.showBorder    ) ? options.showBorder    : false );
        var gradientFill  = ( hasval( options ) && hasval( options.gradientFill  ) ? options.gradientFill  : undefined );
        var tickLabeler   = ( hasval( options ) && hasval( options.tickLabeler   ) ? options.tickLabeler   : undefined );
        
        var tickPositions = new Float32Array( 0 );

        var gradientProgram = new Program( heatmap_VERTSHADER, gradient_FRAGSHADER );
        var gradientProgram_u_modelViewMatrix = new UniformMatrix4f( gradientProgram, 'u_modelViewMatrix' );
        var gradientProgram_u_colorTexture = new UniformSampler2D( gradientProgram, 'u_colorTex' );
        var gradientProgram_a_vertCoord = new Attribute( gradientProgram, 'a_vertCoord' );
        var gradientProgram_a_texCoord = new Attribute( gradientProgram, 'a_texCoord' );
        
        if ( gradientFill ) var gradientColorTexture = getGradientTexture( gradientFill );
        
        var gradientVertCoords = new Float32Array( 0 );
        var gradientVertCoordsBuffer = newDynamicBuffer( );
        
        var gradientTexCoords = new Float32Array( 0 );
        var gradientTexCoordsBuffer = newDynamicBuffer( );
        
        var borderProgram = new Program( modelview_VERTSHADER, solid_FRAGSHADER );
        var borderProgram_a_Position = new Attribute( borderProgram, 'a_Position' );
        var borderProgram_u_modelViewMatrix = new UniformMatrix4f( borderProgram, 'u_modelViewMatrix' );
        var borderProgram_u_Color = new UniformColor( borderProgram, 'u_Color' );
        
        var borderCoords = new Float32Array( 0 );
        var borderCoordsBuffer = newDynamicBuffer( );
        
        var marksProgram = new Program( edgeMarks_VERTSHADER( labelSide ), solid_FRAGSHADER );
        var marksProgram_u_VMin = new Uniform1f( marksProgram, 'u_VMin' );
        var marksProgram_u_VSize = new Uniform1f( marksProgram, 'u_VSize' );
        var marksProgram_u_ViewportSize = new Uniform2f( marksProgram, 'u_ViewportSize' );
        var marksProgram_u_MarkSize = new Uniform1f( marksProgram, 'u_MarkSize' );
        var marksProgram_u_Color = new UniformColor( marksProgram, 'u_Color' );
        var marksProgram_a_VCoord = new Attribute( marksProgram, 'a_VCoord' );

        var markCoords = new Float32Array( 0 );
        var markCoordsBuffer = newDynamicBuffer( );

        var textTextures = <Cache<TextTexture2D>> newTextTextureCache( font, textColor );
        var textureRenderer = new TextureRenderer( );
        var hTickLabels = textTextures.value( '-0.123456789' ).h;
        var isVerticalAxis = ( labelSide === Side.LEFT || labelSide === Side.RIGHT );

        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
        
            var sizePixels = isVerticalAxis ? viewport.h : viewport.w;
            if ( sizePixels === 0 ) return;
            var approxNumTicks = sizePixels / tickSpacing;
            var tickInterval = getTickInterval( axis, approxNumTicks );
            var tickCount = getTickCount( axis, tickInterval );
            tickPositions = ensureCapacityFloat32( tickPositions, tickCount );
            getTickPositions( axis, tickInterval, tickCount, tickPositions );

            
            // Border Box and Gradient Fill
            //
            
            //XXX border vertices are fixed in normalized 0-1 viewport coordinates
            //XXX they could be calculated ahead of time -- however I had trouble with 'fuzzy' lines when using 0-1 coordinates
            if ( showBorder || gradientFill ) {
                borderCoords = ensureCapacityFloat32( borderCoords, 10 );
                
                var horizontal = ( labelSide === Side.TOP || labelSide === Side.BOTTOM );
                var bFlip = ( labelSide === Side.LEFT || labelSide === Side.BOTTOM );
                var width = viewport.w - 1;
                var height = viewport.h - 1;
                
                borderCoords[0] = horizontal  ? 0 : ( bFlip ? width - tickSize : 0 );
                borderCoords[1] = !horizontal ? 0 : ( bFlip ? height - tickSize : 0 );
                
                borderCoords[2] = horizontal  ? 0 : ( bFlip ? width : tickSize );
                borderCoords[3] = !horizontal ? 0 : ( bFlip ? height : tickSize );
                
                borderCoords[4] = horizontal  ? width : ( bFlip ? width : tickSize );
                borderCoords[5] = !horizontal ? height : ( bFlip ? height : tickSize );
                
                borderCoords[6] = horizontal  ? width : ( bFlip ? width - tickSize : 0 );
                borderCoords[7] = !horizontal ? height : ( bFlip ? height - tickSize : 0 );
                
                // finish off the box (same as 0, 1 coordinates)
                borderCoords[8] = horizontal  ? 0 : ( bFlip ? width - tickSize : 0 );
                borderCoords[9] = !horizontal ? 0 : ( bFlip ? height - tickSize : 0 );
            }
            
            if ( gradientFill ) {
                gradientProgram.use( gl );
                gradientProgram_u_modelViewMatrix.setData( gl, glOrthoViewport( viewport ) );
                gradientProgram_u_colorTexture.setDataAndBind( gl, 0, gradientColorTexture );
                
                gradientVertCoords = ensureCapacityFloat32( gradientVertCoords, 8 );
                gradientVertCoords[0] = borderCoords[2];
                gradientVertCoords[1] = borderCoords[3];
                gradientVertCoords[2] = borderCoords[0];
                gradientVertCoords[3] = borderCoords[1];
                gradientVertCoords[4] = borderCoords[4];
                gradientVertCoords[5] = borderCoords[5];
                gradientVertCoords[6] = borderCoords[6];
                gradientVertCoords[7] = borderCoords[7];
                gradientVertCoordsBuffer.setData( gradientVertCoords );
                gradientProgram_a_vertCoord.setDataAndEnable( gl, gradientVertCoordsBuffer, 2, GL.FLOAT );
                
                // y texture coordinates don't really matter ( we're simulating a 1d texture )
                // using a 1-by-n 2d texture because 1d textures aren't available 
                gradientTexCoords = ensureCapacityFloat32( gradientTexCoords, 8 );
                gradientTexCoords[0] = 0;
                gradientTexCoords[1] = 0;
                gradientTexCoords[2] = 0;
                gradientTexCoords[3] = 0;
                gradientTexCoords[4] = 1;
                gradientTexCoords[5] = 1;
                gradientTexCoords[6] = 1;
                gradientTexCoords[7] = 1;
                gradientTexCoordsBuffer.setData( gradientTexCoords );
                gradientProgram_a_texCoord.setDataAndEnable( gl, gradientTexCoordsBuffer, 2, GL.FLOAT );
                
                gl.drawArrays( GL.TRIANGLE_STRIP, 0, 4 );
                
                gradientProgram_u_colorTexture.unbind( gl );
                gradientProgram_a_vertCoord.disable( gl );
                gradientProgram_a_texCoord.disable( gl );
                gradientProgram.endUse( gl );
            }
            
            if ( showBorder ) {
                borderProgram.use( gl );
                borderProgram_u_Color.setData( gl, tickColor );
                borderProgram_u_modelViewMatrix.setData( gl, glOrthoViewport( viewport ) );
                
                borderCoordsBuffer.setData( borderCoords.subarray( 0, 10 ) );
                borderProgram_a_Position.setDataAndEnable( gl, borderCoordsBuffer, 2, GL.FLOAT );
                
                // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
                gl.lineWidth( 1 );
                gl.drawArrays( GL.LINE_STRIP, 0, 5 );
    
                borderProgram_a_Position.disable( gl );
                borderProgram.endUse( gl );
            }

            // Tick marks
            //

            marksProgram.use( gl );
            marksProgram_u_VMin.setData( gl, axis.vMin );
            marksProgram_u_VSize.setData( gl, axis.vSize );
            marksProgram_u_ViewportSize.setData( gl, viewport.w, viewport.h );
            marksProgram_u_MarkSize.setData( gl, tickSize );
            marksProgram_u_Color.setData( gl, tickColor );

            markCoords = ensureCapacityFloat32( markCoords, 4*tickCount );
            for ( var n = 0; n < tickCount; n++ ) {
                var v = tickPositions[ n ];
                markCoords[ ( 4*n + 0 ) ] = v;
                markCoords[ ( 4*n + 1 ) ] = 0;
                markCoords[ ( 4*n + 2 ) ] = v;
                markCoords[ ( 4*n + 3 ) ] = 1;
            }
            markCoordsBuffer.setData( markCoords.subarray( 0, 4*tickCount ) );
            marksProgram_a_VCoord.setDataAndEnable( gl, markCoordsBuffer, 2, GL.FLOAT );

            // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
            gl.lineWidth( 1 );
            gl.drawArrays( GL.LINES, 0, 2*tickCount );

            marksProgram_a_VCoord.disable( gl );
            marksProgram.endUse( gl );


            // Tick labels
            //

            gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
            gl.enable( GL.BLEND );

            var orderAxisRaw = order( Math.abs( axis.vSize ) );
            var orderAxis = 0;
            if ( orderAxisRaw > 0 ) {
                orderAxis = Math.floor( ( orderAxisRaw - 1 ) / 3 ) * 3;
            }
            else if ( orderAxisRaw < 0 ) {
                orderAxis = ( Math.ceil( orderAxisRaw / 3 ) - 1 ) * 3;
            }
            var orderFactor = Math.pow( 10, -orderAxis );
            var orderTick = order( tickInterval );
            var precision = Math.max( 0, orderAxis - orderTick );

            textTextures.resetTouches( );
            textureRenderer.begin( gl, viewport );

            for ( var n = 0; n < tickCount; n++ ) {
                var v = tickPositions[ n ];
                var vFrac = axis.vFrac( v );
                if ( vFrac < 0 || vFrac >= 1 ) continue;

                var tickLabel;
                if ( tickLabeler ) {
                    // show custom tick value
                    tickLabel = tickLabeler( v, axis, tickInterval );
                }
                else if ( shortenLabels && showLabel ) {
                    // show shortened tick value
                    tickLabel = Number( v * orderFactor ).toFixed( precision );
                }
                else if ( !shortenLabels ) {
                    // show actual tick value
                    if ( orderAxisRaw >= 0 ) {
                        tickLabel = Number( v ).toFixed( 0 );
                    }
                    else {
                        tickLabel = Number( v ).toFixed( -orderAxisRaw );
                    }
                }
                else {
                    // show magnitude inline for each tick
                    tickLabel = Number( v * orderFactor ).toFixed( precision ) + ( orderAxis === 0 ? '' : 'e' + orderAxis );
                }
                var textTexture = textTextures.value( tickLabel );

                var xFrac : number;
                var yFrac : number;
                if ( labelSide === Side.LEFT || labelSide === Side.RIGHT ) {
                    var yAnchor = textTexture.yAnchor( 0.43 );
                    var j0 = ( vFrac * viewport.h ) - yAnchor*textTexture.h;
                    var j = clamp( 0, viewport.h - textTexture.h, j0 );
                    yFrac = j / viewport.h;

                    if ( labelSide === Side.LEFT ) {
                        xFrac = ( viewport.w - tickSize - 2 - textTexture.w ) / viewport.w;
                    }
                    else {
                        xFrac = ( tickSize + 2 ) / viewport.w;
                    }
                }
                else {
                    var wMinus = 0;
                    if ( v < 0 ) {
                        var absTickLabel = Number( Math.abs( v ) * orderFactor ).toFixed( precision );
                        wMinus = textTexture.w - textTextures.value( absTickLabel ).w;
                    }

                    var xAnchor = 0.45;
                    var i0 = ( vFrac * viewport.w ) - xAnchor*( textTexture.w - wMinus ) - wMinus;
                    var i = clamp( 0, viewport.w - textTexture.w, i0 );
                    xFrac = i / viewport.w;

                    if ( labelSide === Side.BOTTOM ) {
                        yFrac = ( viewport.h - tickSize - 2 - hTickLabels ) / viewport.h;
                    }
                    else {
                        yFrac = ( tickSize + 2 ) / viewport.h;
                    }
                }
                textureRenderer.draw( gl, textTexture, xFrac, yFrac, { xAnchor: 0, yAnchor: 0 } );
            }


            // Axis label
            //

            if ( showLabel ) {
                var unitsString = units + ( !shortenLabels || orderAxis === 0 ? '' : ' x 10^' + orderAxis.toFixed( 0 ) );
                var axisLabel = label + ( unitsString ? ' (' + unitsString + ')' : '' );
                
                if ( axisLabel !== '' ) {
                    var textTexture = textTextures.value( axisLabel );
    
                    var xFrac : number;
                    var yFrac : number;
                    var textOpts : TextureDrawOptions;
                    if ( labelSide === Side.LEFT || labelSide === Side.RIGHT ) {
                        // Using hTickLabels here works out about right, even though the tick-label text is horizontal
                        var xFrac0 = 0.5 * ( viewport.w - tickSize - 2 - hTickLabels ) / viewport.w;
                        xFrac = ( labelSide === Side.LEFT ? xFrac0 : 1 - xFrac0 );
                        yFrac = 0.5;
                        textOpts = { xAnchor: textTexture.yAnchor( 0.5 ),
                                     yAnchor: 0.5,
                                     rotation_CCWRAD: 0.5 * Math.PI };
                    }
                    else {
                        var yFrac0 = 0.5 * ( viewport.h - tickSize - 2 - hTickLabels ) / viewport.h;
                        yFrac = ( labelSide === Side.BOTTOM ? yFrac0 : 1 - yFrac0 );
                        xFrac = 0.5;
                        textOpts = { xAnchor: 0.5,
                                     yAnchor: textTexture.yAnchor( 0.5 ),
                                     rotation_CCWRAD: 0 };
                    }
                    textureRenderer.draw( gl, textTexture, xFrac, yFrac, textOpts );
                }
            }


            // Finish up
            //

            textureRenderer.end( gl );
            textTextures.retainTouched( );
        };
    }

}
