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


    export function runPlotExample( container : Node ) {


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



        // Settings
        //

        var bgColor = rgb( 0.965, 0.957, 0.949 );
        var textColor = black;
        var tickColor = black;

        var xyAxis = newAxis2D( -1, 7, -1000, 5000 );
        var xAxis = xyAxis.xAxis;
        var yAxis = xyAxis.yAxis;

        xyAxis.onLimitsChanged( drawable.redraw );



        // Panes & Painters
        //

        var centerPane = new Pane( null );
        centerPane.addPainter( newBackgroundPainter( bgColor ) );
        centerPane.addPainter( newBorderPainter( tickColor ) );
        attachAxisMouseListeners2D( centerPane, xyAxis );

        var topPane = new Pane( null );
        topPane.addPainter( newBackgroundPainter( green ) );
        topPane.addPainter( newEdgeAxisPainter( xAxis, Side.TOP, { label: 'Top', textColor: textColor, tickColor: tickColor, tickSize : 12, gradientFill : jet, showBorder: true } ) );
        attachAxisMouseListeners1D( topPane, xAxis, false );

        var leftPane = new Pane( null );
        leftPane.addPainter( newBackgroundPainter( yellow ) );
        leftPane.addPainter( newEdgeAxisPainter( yAxis, Side.LEFT, { label: 'Y', textColor: textColor, tickColor: tickColor, tickSize : 12, gradientFill : reverseBone, showBorder: true } ) );
        attachAxisMouseListeners1D( leftPane, yAxis, true );

        var bottomPane = new Pane( null );
        bottomPane.addPainter( newBackgroundPainter( cyan ) );
        bottomPane.addPainter( newEdgeAxisPainter( xAxis, Side.BOTTOM, { label: 'X', textColor: textColor, tickColor: tickColor, tickSize : 12, gradientFill : reverseBone, showBorder: true } ) );
        attachAxisMouseListeners1D( bottomPane, xAxis, false );

        var rightPane = new Pane( null );
        rightPane.addPainter( newBackgroundPainter( magenta ) );
        rightPane.addPainter( newEdgeAxisPainter( yAxis, Side.RIGHT, { label: 'Right', textColor: textColor, tickColor: tickColor, tickSize : 12, gradientFill : jet, showBorder: true } ) );
        attachAxisMouseListeners1D( rightPane, yAxis, true );

        var plotPane = new Pane( newPlotLayout( ) );
        plotPane.addPane( topPane, Side.TOP );
        plotPane.addPane( leftPane, Side.LEFT );
        plotPane.addPane( rightPane, Side.RIGHT );
        plotPane.addPane( bottomPane, Side.BOTTOM );
        plotPane.addPane( centerPane, null );



        // Show
        //

        drawable.setContentPane( plotPane );
        drawable.redraw( );


    }


}
