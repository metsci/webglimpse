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



    function childWidth( child : LayoutEntry ) : number {
        var usePrefWidth = ( !hasval( child.layoutOptions ) || child.layoutOptions.width === undefined || child.layoutOptions.width === 'pref' );
        return ( usePrefWidth ? child.prefSize.w : child.layoutOptions.width );
    }


    export function newColumnLayout( leftToRight : boolean = true ) : Layout {

        return {


            updatePrefSize: function( parentPrefSize : Size, children : LayoutEntry[] ) {
                var childrenToPlace = <LayoutEntry[]> [ ];
                for ( var c = 0; c < children.length; c++ ) {
                    var child = children[ c ];
                    if ( isNumber( child.layoutArg ) && !( child.layoutOptions && child.layoutOptions.hide ) ) {
                        childrenToPlace.push( child );
                    }
                }

                var hMax = 0;
                var wSum = 0;
                for ( var c = 0; c < childrenToPlace.length; c++ ) {
                    var child = childrenToPlace[ c ];

                    var honorChildHeight = !( child.layoutOptions && child.layoutOptions.ignoreHeight );
                    if ( honorChildHeight ) {
                        var h = child.prefSize.h;
                        if ( hasval( hMax ) && hasval( h ) ) {
                            hMax = Math.max( hMax, h );
                        }
                        else {
                            hMax = null;
                        }
                    }

                    var w = childWidth( child );
                    if ( hasval( wSum ) && hasval( w ) ) {
                        wSum += w;
                    }
                    else {
                        wSum = null;
                    }
                }
                parentPrefSize.w = wSum;
                parentPrefSize.h = hMax;
            },


            updateChildViewports: function( children : LayoutEntry[], parentViewport : BoundsUnmodifiable ) {
                var childrenToPlace = <LayoutEntry[]> [ ];
                var childrenToHide = <LayoutEntry[]> [ ];
                for ( var c = 0; c < children.length; c++ ) {
                    var child = children[ c ];
                    if ( isNumber( child.layoutArg ) && !( child.layoutOptions && child.layoutOptions.hide ) ) {
                        childrenToPlace.push( child );
                    }
                    else {
                        childrenToHide.push( child );
                    }
                }

                // Use the original index to make the sort stable
                var indexProp = 'webglimpse_columnLayout_index';
                for ( var c = 0; c < childrenToPlace.length; c++ ) {
                    var child = childrenToPlace[ c ];
                    child[ indexProp ] = c;
                }

                childrenToPlace.sort( function( a : LayoutEntry, b : LayoutEntry ) {
                    var orderDiff = a.layoutArg - b.layoutArg;
                    return ( orderDiff !== 0 ? orderDiff : ( a[ indexProp ] - b[ indexProp ] ) );
                } );

                var numFlexible = 0;
                var totalFlexWidth = parentViewport.w;
                for ( var c = 0; c < childrenToPlace.length; c++ ) {
                    var w = childWidth( childrenToPlace[ c ] );
                    if ( hasval( w ) ) {
                        totalFlexWidth -= w;
                    }
                    else {
                        numFlexible++;
                    }
                }
                var flexWidth = totalFlexWidth / numFlexible;

                if ( leftToRight ) {
                    var jStart = parentViewport.jStart;
                    var jEnd = parentViewport.jEnd;
                    var iStart = parentViewport.iStart;
                    var iRemainder = 0;
                    for ( var c = 0; c < childrenToPlace.length; c++ ) {
                        var child = childrenToPlace[ c ];

                        var iEnd : number;
                        var w = childWidth( child );
                        if ( hasval( w ) ) {
                            iEnd = iStart + w;
                        }
                        else {
                            var iEnd0 = iStart + flexWidth + iRemainder;
                            iEnd = Math.round( iEnd0 );
                            iRemainder = iEnd0 - iEnd;
                        }

                        child.viewport.setEdges( iStart, iEnd, jStart, jEnd );
                        iStart = iEnd;
                    }
                }
                else {
                    var jStart = parentViewport.jStart;
                    var jEnd = parentViewport.jEnd;
                    var iEnd = parentViewport.iEnd;
                    var iRemainder = 0;
                    for ( var c = 0; c < childrenToPlace.length; c++ ) {
                        var child = childrenToPlace[ c ];

                        var iStart : number;
                        var w = childWidth( child );
                        if ( hasval( w ) ) {
                            iStart = iEnd - w;
                        }
                        else {
                            var iStart0 = iEnd - flexWidth - iRemainder;
                            iStart = Math.round( iStart0 );
                            iRemainder = iStart - iStart0;
                        }

                        child.viewport.setEdges( iStart, iEnd, jStart, jEnd );
                        iEnd = iStart;
                    }
                }

                for ( var c = 0; c < childrenToHide.length; c++ ) {
                    childrenToHide[ c ].viewport.setEdges( 0, 0, 0, 0 );
                }
            }


        };
    }
