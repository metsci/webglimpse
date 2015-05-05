
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

    export function newTimeseriesAnnotationPainterFactory( ) : TimelineTimeseriesPainterFactory {
        // Painter Factory
        return function( drawable : Drawable, timeAxis : TimeAxis1D, dataAxis : Axis1D, model : TimelineModel, rowModel : TimelineRowModel, ui : TimelineUi ) : Painter {
            
            var textTextures = newTextTextureCache3( );
            var textureRenderer = new TextureRenderer( );
            
            // Painter
            return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
                
                textTextures.resetTouches( );
                textureRenderer.begin( gl, viewport );
                
                for ( var i = 0 ; i < rowModel.annotationGuids.length ; i++ ) {
                    var annotationGuid : string = rowModel.annotationGuids.valueAt(i);
                    var annotation : TimelineAnnotationModel = model.annotation( annotationGuid );
                    var annotationStyle : TimelineAnnotationStyleUi = ui.annotationStyle( annotation.styleGuid );
                    
                    var font = hasval( annotationStyle.font ) ? annotationStyle.font : '11px verdana,sans-serif';
                    var color = hasval( annotationStyle.color ) ? annotationStyle.color : white;
                    
                    var hTextOffset = hasval( annotationStyle.hTextOffset ) ? annotationStyle.hTextOffset : 0;
                    var vTextOffset = hasval( annotationStyle.vTextOffset ) ? annotationStyle.vTextOffset : 0;
                    
                    var xFrac = timeAxis.tFrac( annotation.time_PMILLIS );
                    var yFrac = dataAxis.vFrac( annotation.y );
                    
                    for ( var n = 0; n < annotationStyle.numIcons; n++ ) {
                        var icon : TimelineAnnotationIcon = annotationStyle.icon( n );
                        
                        var xFracOffset = xFrac + ( hasval( icon.hOffset ) ? icon.hOffset : 0 ) / viewport.w;
                        var yFracOffset = yFrac + ( hasval( icon.vOffset ) ? icon.vOffset : 0 ) / viewport.h;
                        
                        var iconTexture = ui.loadImage( icon.url, function( ) { drawable.redraw( ); } );
                        if ( iconTexture ) {
                            textureRenderer.draw( gl, iconTexture, xFracOffset, yFracOffset, { xAnchor: ( hasval( icon.hAlign ) ? icon.hAlign : 0.5 ),
                                                                                               yAnchor: ( hasval( icon.hAlign ) ? icon.hAlign : 0.5 ),
                                                                                               width: icon.displayWidth,
                                                                                               height: icon.displayHeight,
                                                                                               rotation_CCWRAD: 0 } );
                        
                            // draw the next icon forward by the width 
                        }
                    }
                    
                    if ( hasval( annotation.label ) ) {
                        
                        var xFracOffset = xFrac + hTextOffset / viewport.w;
                        var yFracOffset = yFrac + vTextOffset / viewport.h;
                        
                        var textTexture = textTextures.value( font, color.rgbaString, annotation.label );
                        textureRenderer.draw( gl, textTexture, xFracOffset, yFracOffset, { xAnchor: 0,
                                                                                           yAnchor: textTexture.yAnchor( 0.5 ) } );
                    }
                }
                
                textureRenderer.end( gl );
                textTextures.retainTouched( );
            };
        };
    }
}