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


    export interface XyLinePainterOptions {
        color?     : Color;
        blend?     : boolean;
        thickness? : number;
    }


    /**
     * Simple xy line painter which displays static data
     */
    export function newXyLinePainter( axis : Axis2D, xCoords : number[], yCoords : number[], options? : XyLinePainterOptions ) : Painter {
        var thickness = ( hasval( options ) && hasval( options.thickness ) ? options.thickness : 4     );
        var color     = ( hasval( options ) && hasval( options.color )     ? options.color     : black );
        var blend     = ( hasval( options ) && hasval( options.blend )     ? options.blend     : false );

        var program = new Program( modelview_VERTSHADER, solid_FRAGSHADER );
        var u_Color = new UniformColor( program, 'u_Color' );
        var u_modelViewMatrix = new UniformMatrix4f( program, 'u_modelViewMatrix' );

        var coordArray = [];
        for ( var i = 0 ; i < xCoords.length ; i++ ) {
            coordArray[2*i]   = xCoords[i];
            coordArray[2*i+1] = yCoords[i];
        }
        var coordFloatArray = new Float32Array( coordArray );
        var coordBuffer = newStaticBuffer( coordFloatArray );
        var dim = 2;
        var count = coordFloatArray.length / dim;

        return function( gl : WebGLRenderingContext, viewport : BoundsUnmodifiable ) {

            if ( blend ) {
                gl.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
                gl.enable( GL.BLEND );
            }

            // enable the shader
            program.use( gl );

            // set color and projection matrix variables
            u_Color.setData( gl, color );
            // here we set the projection matrix for x coordinates between
            // -5 and 5 and y coordinates between -10 and 10
            u_modelViewMatrix.setData( gl, glOrthoAxis( axis ) );

            // XXX: IE doesn't support lineWidth
            gl.lineWidth( thickness );

            // enable vertex attribute array corresponding to vPosition variable in shader
            gl.enableVertexAttribArray( 0 );

            // bind buffer data to vertex attribute array
            coordBuffer.bind( gl, GL.ARRAY_BUFFER );
            // first argument corresponds to the 0 attrib array set above
            // second argument indicates two coordinates per vertex
            gl.vertexAttribPointer( 0, dim, GL.FLOAT, false, 0, 0 );

            // draw the lines
            gl.drawArrays( GL.LINE_STRIP, 0, count );

            coordBuffer.unbind( gl, GL.ARRAY_BUFFER );
            program.endUse( gl );
        }
    }


}