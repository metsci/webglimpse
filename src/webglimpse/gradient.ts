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


    // value: a number from 0-1
    // out: four component RGBA array indicating the gradient color for the input fraction
    export interface Gradient {
        ( value : number ) : number[];
    }

    // fills an array with jet colorscale values
    // webgl does not support 1D textures, so a 2D texture must be used
    export function jet( value : number ) : number[] {

        var x = 4.0 * value;

        var r = clamp( 1.5 - Math.abs( x - 3.0 ), 0, 1 );
        var g = clamp( 1.5 - Math.abs( x - 2.0 ), 0, 1 );
        var b = clamp( 1.5 - Math.abs( x - 1.0 ), 0, 1 );

        return [ r, g, b, 1.0 ];
    }

    export function reverseBone( value : number ) : number[] {

        var x = 1 - 0.875 * value;
        if ( value < 0.375 )
        {
            return [ x, x, x - value / 3, 1 ];
        }
        else if ( value < 0.75 )
        {
            return [ x, x + 0.125 - value / 3, x - 0.125, 1 ];
        }
        else
        {
            return [ x + 0.375 - value * 0.5, x - 0.125, x - 0.125, 1 ];
        }

    }

    export function getGradientTexture( gradient : Gradient, size : number = 1024 ) : Texture {
        var array = new Float32Array( size * 4 );

        for ( var v = 0 ; v < size ; v++ ) {
            var color = gradient( v / size );

            array[ 4*v + 0 ] = color[0];
            array[ 4*v + 1 ] = color[1];
            array[ 4*v + 2 ] = color[2];
            array[ 4*v + 3 ] = color[3];
        }

        return new FloatDataTexture2D( size, 1, array );
    }

    function clamp( n : number, min : number, max : number ) : number {
        if ( n < min ) {
            return min;
        }
        else if ( n > max ) {
            return max;
        }
        else {
            return n;
        }
    }
