/*!
 * Web Glimpse v1.9.1
 * Released: 2016-11-22 16:56:17 UTC
 * https://glimpse.metsci.com/webglimpse/
 *
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
var Webglimpse;

(function(Webglimpse) {
    function runPlotExample(container) {
        // DOM Setup
        //
        var canvas = document.createElement("canvas");
        canvas.id = "exampleCanvas";
        canvas.style.padding = "0";
        container.appendChild(canvas);
        var drawable = Webglimpse.newDrawable(canvas);
        var updateCanvasSize = function() {
            canvas.width = $(canvas).width();
            canvas.height = $(canvas).height();
            drawable.redraw();
        };
        $(window).resize(updateCanvasSize);
        updateCanvasSize();
        // Settings
        //
        var bgColor = Webglimpse.rgb(.965, .957, .949);
        var textColor = Webglimpse.black;
        var tickColor = Webglimpse.black;
        var xyAxis = Webglimpse.newAxis2D(-1, 7, -1e3, 5e3);
        var xAxis = xyAxis.xAxis;
        var yAxis = xyAxis.yAxis;
        xyAxis.onLimitsChanged(drawable.redraw);
        // Panes & Painters
        //
        var centerPane = new Webglimpse.Pane(null);
        centerPane.addPainter(Webglimpse.newBackgroundPainter(bgColor));
        centerPane.addPainter(Webglimpse.newBorderPainter(tickColor));
        Webglimpse.attachAxisMouseListeners2D(centerPane, xyAxis);
        var topPane = new Webglimpse.Pane(null);
        topPane.addPainter(Webglimpse.newBackgroundPainter(Webglimpse.green));
        topPane.addPainter(Webglimpse.newEdgeAxisPainter(xAxis, 0, {
            label: "Top",
            textColor: textColor,
            tickColor: tickColor,
            tickSize: 12,
            gradientFill: Webglimpse.jet,
            showBorder: true
        }));
        Webglimpse.attachAxisMouseListeners1D(topPane, xAxis, false);
        var leftPane = new Webglimpse.Pane(null);
        leftPane.addPainter(Webglimpse.newBackgroundPainter(Webglimpse.yellow));
        leftPane.addPainter(Webglimpse.newEdgeAxisPainter(yAxis, 3, {
            label: "Y",
            textColor: textColor,
            tickColor: tickColor,
            tickSize: 12,
            gradientFill: Webglimpse.reverseBone,
            showBorder: true
        }));
        Webglimpse.attachAxisMouseListeners1D(leftPane, yAxis, true);
        var bottomPane = new Webglimpse.Pane(null);
        bottomPane.addPainter(Webglimpse.newBackgroundPainter(Webglimpse.cyan));
        bottomPane.addPainter(Webglimpse.newEdgeAxisPainter(xAxis, 1, {
            label: "X",
            textColor: textColor,
            tickColor: tickColor,
            tickSize: 12,
            gradientFill: Webglimpse.reverseBone,
            showBorder: true
        }));
        Webglimpse.attachAxisMouseListeners1D(bottomPane, xAxis, false);
        var rightPane = new Webglimpse.Pane(null);
        rightPane.addPainter(Webglimpse.newBackgroundPainter(Webglimpse.magenta));
        rightPane.addPainter(Webglimpse.newEdgeAxisPainter(yAxis, 2, {
            label: "Right",
            textColor: textColor,
            tickColor: tickColor,
            tickSize: 12,
            gradientFill: Webglimpse.jet,
            showBorder: true
        }));
        Webglimpse.attachAxisMouseListeners1D(rightPane, yAxis, true);
        var plotPane = new Webglimpse.Pane(Webglimpse.newPlotLayout());
        plotPane.addPane(topPane, 0);
        plotPane.addPane(leftPane, 3);
        plotPane.addPane(rightPane, 2);
        plotPane.addPane(bottomPane, 1);
        plotPane.addPane(centerPane, null);
        // Show
        //
        drawable.setContentPane(plotPane);
        drawable.redraw();
    }
    Webglimpse.runPlotExample = runPlotExample;
})(Webglimpse || (Webglimpse = {}));
//# sourceMappingURL=plot.js.map