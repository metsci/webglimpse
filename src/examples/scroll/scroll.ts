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


    export function runScrollExample( container : Node ) {


        // DOM Setup
        //

        var canvas = document.createElement( 'canvas' );
        canvas.id = 'exampleCanvas';
        canvas.style.padding = '0';
        container.appendChild( canvas );

        var drawable = newDrawable( canvas );

        var updateCanvasSize = function( ) {
            canvas.width = $( canvas ).width( );
            canvas.height = $( canvas ).height( );
            drawable.redraw( );
        };
        $( window ).resize( updateCanvasSize );
        updateCanvasSize( );



        // Scroll-pane Setup
        //

        var rowsPane = new Pane( newRowLayout( ) );

        var scrollLayout = newVerticalScrollLayout( );
        var scrollable = new Pane( scrollLayout, false );
        scrollable.addPainter( newBackgroundPainter( white ) );
        scrollable.addPane( newInsetPane( rowsPane, newInsets( 12, 10 ), white ), 0 );

        var scrollbar = newVerticalScrollbar( scrollLayout, drawable );

        var scrollPane = new Pane( newColumnLayout( false ), false );
        scrollPane.addPane( scrollbar, 0, { width: 16 } );
        scrollPane.addPane( scrollable, 1 );

        drawable.setContentPane( scrollPane );
        drawable.redraw( );



        // Example Content
        //

        var numRows = 500;
        var rowBgColors = [ black, green, blue, cyan ];
        var rowFgColors = [ white, black, white, black ];

        var createTextTexture = createTextTextureFactory( '20px verdana,sans-serif' );
        for ( var r = 0; r < numRows; r++ ) {
            var row = new Pane( { updatePrefSize: fixedSize( null, 50 ) } );
            row.addPainter( newBackgroundPainter( rowBgColors[ r % rowBgColors.length ] ) );

            var text = r.toFixed( 0 );
            if ( r === 0 ) text += ' first';
            if ( r === numRows-1 ) text += ' last';

            var labelTexture =  createTextTexture( rowFgColors[ r % rowFgColors.length ], text );
            row.addPainter( newTexturePainter( labelTexture, 0, 0.5, { xAnchor: 0, yAnchor: labelTexture.yAnchor( 0.5 ) } ) );

            setTimeout( ( function( row : Pane, r : number ) {
                return function( ) {
                    rowsPane.addPane( row, r );
                    drawable.redraw( );
                };
            } )( row, r ), 10*r );
        }


    }


}
