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
import { Color, black } from '../color';
import { TimeAxis1D } from './time_axis';
import { Side, solid_FRAGSHADER } from '../misc';
import { Painter } from '../core';
import { Program, Uniform1f, Uniform2f, UniformColor, Attribute } from '../shader';
import { edgeMarks_VERTSHADER } from '../plot/edge_axis_painter';
import { newDynamicBuffer } from '../buffer';
import { Cache } from '../util/cache';
import { TextTexture2D, newTextTextureCache } from '../text';
import { TextureRenderer, TextureDrawOptions } from '../texture';
import { BoundsUnmodifiable } from '../bounds';
import { ensureCapacityFloat32, GL, hasval, parseTime_PMILLIS, clamp } from '../util/util';
import { minutesToMillis, millisToDays, hoursToMillis, daysToMillis, millisToHours, secondsToMillis } from '../time';
import { Axis1D, getTickInterval, getTickCount, getTickPositions } from '../plot/axis';
import moment, { Moment } from 'moment';

// XXX: Much of this is duplicated from edge_axis_painter

export class FormatOptions {
    tickFormat: string;
    prefixFormat: string;
    constructor(tick: string, prefix: string) {
        this.tickFormat = tick;
        this.prefixFormat = prefix;
    }
}

export interface TimeAxisFormatOptions {
    hour?: FormatOptions;
    day?: FormatOptions;
    month?: FormatOptions;
    year?: FormatOptions;
}

export interface TimeAxisPainterOptions {
    tickSpacing?: number;
    font?: string;
    textColor?: Color;
    tickColor?: Color;
    tickSize?: number;
    labelAlign?: number;
    referenceDate?: string;
    timeAxisFormat?: TimeAxisFormatOptions;
    // if true, relative date labels in the future are positive (Day 1)
    // if false, relative date labels in the future are negative (Day -1)
    isFuturePositive?: boolean;
}


export function newTimeAxisPainter(timeAxis: TimeAxis1D, labelSide: Side, displayTimeZone: string, tickTimeZone: string, options?: TimeAxisPainterOptions): Painter {
    const tickSpacing = (hasval(options) && hasval(options.tickSpacing) ? options.tickSpacing : 60);
    const font = (hasval(options) && hasval(options.font) ? options.font : '11px verdana,sans-serif');
    const textColor = (hasval(options) && hasval(options.textColor) ? options.textColor : black);
    const tickColor = (hasval(options) && hasval(options.tickColor) ? options.tickColor : black);
    const tickSize = (hasval(options) && hasval(options.tickSize) ? options.tickSize : 6);
    const labelAlign = (hasval(options) && hasval(options.labelAlign) ? options.labelAlign : 0.5);
    const referenceDate_PMILLIS = (hasval(options) && hasval(options.referenceDate) ? parseTime_PMILLIS(options.referenceDate) : undefined);
    const isFuturePositive = (hasval(options) && hasval(options.isFuturePositive) ? options.isFuturePositive : true);
    const timeAxisFormat = (hasval(options) && hasval(options.timeAxisFormat) ? options.timeAxisFormat : undefined);

    const marksProgram = new Program(edgeMarks_VERTSHADER(labelSide), solid_FRAGSHADER);
    const marksProgram_u_VMin = new Uniform1f(marksProgram, 'u_VMin');
    const marksProgram_u_VSize = new Uniform1f(marksProgram, 'u_VSize');
    const marksProgram_u_ViewportSize = new Uniform2f(marksProgram, 'u_ViewportSize');
    const marksProgram_u_MarkSize = new Uniform1f(marksProgram, 'u_MarkSize');
    const marksProgram_u_Color = new UniformColor(marksProgram, 'u_Color');
    const marksProgram_a_VCoord = new Attribute(marksProgram, 'a_VCoord');

    let markCoords = new Float32Array(0);
    const markCoordsBuffer = newDynamicBuffer();

    const textTextures = <Cache<TextTexture2D>>newTextTextureCache(font, textColor);
    const textureRenderer = new TextureRenderer();
    const hTickLabels = textTextures.value('-0123456789:.').h;
    const isVerticalAxis = (labelSide === Side.LEFT || labelSide === Side.RIGHT);

    return function (gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {

        const sizePixels = isVerticalAxis ? viewport.h : viewport.w;
        if (sizePixels === 0) {
            return;
        }

        const tickTimes_PMILLIS = getTickTimes_PMILLIS(timeAxis, sizePixels, tickSpacing, tickTimeZone, referenceDate_PMILLIS);
        const tickInterval_MILLIS = getTickInterval_MILLIS(tickTimes_PMILLIS);
        const tickCount = tickTimes_PMILLIS.length;


        // Tick marks
        //

        marksProgram.use(gl);
        marksProgram_u_VMin.setData(gl, timeAxis.vMin);
        marksProgram_u_VSize.setData(gl, timeAxis.vSize);
        marksProgram_u_ViewportSize.setData(gl, viewport.w, viewport.h);
        marksProgram_u_MarkSize.setData(gl, tickSize);
        marksProgram_u_Color.setData(gl, tickColor);

        markCoords = ensureCapacityFloat32(markCoords, 4 * tickCount);
        for (let n = 0; n < tickCount; n++) {
            const v = timeAxis.vAtTime(tickTimes_PMILLIS[n]);
            markCoords[(4 * n + 0)] = v;
            markCoords[(4 * n + 1)] = 0;
            markCoords[(4 * n + 2)] = v;
            markCoords[(4 * n + 3)] = 1;
        }
        markCoordsBuffer.setData(markCoords.subarray(0, 4 * tickCount));
        marksProgram_a_VCoord.setDataAndEnable(gl, markCoordsBuffer, 2, GL.FLOAT);

        // IE does not support lineWidths other than 1, so make sure all browsers use lineWidth of 1
        gl.lineWidth(1);
        gl.drawArrays(GL.LINES, 0, 2 * tickCount);

        marksProgram_a_VCoord.disable(gl);
        marksProgram.endUse(gl);

        gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
        gl.enable(GL.BLEND);


        // Tick labels
        //

        const ticks: TickDisplayData = getTickDisplayData(tickInterval_MILLIS, referenceDate_PMILLIS, displayTimeZone, isFuturePositive, timeAxisFormat);

        textTextures.resetTouches();
        textureRenderer.begin(gl, viewport);

        for (let n = 0; n < tickCount; n++) {
            const tickTime_PMILLIS = tickTimes_PMILLIS[n];
            const tFrac = timeAxis.tFrac(tickTime_PMILLIS);
            if (tFrac < 0 || tFrac >= 1) {
                continue;
            }

            const tickLabel: string = ticks.tickFormat(tickTime_PMILLIS);
            const textTexture = textTextures.value(tickLabel);

            let xFrac: number;
            let yFrac: number;
            if (labelSide === Side.LEFT || labelSide === Side.RIGHT) {
                const yAnchor = textTexture.yAnchor(0.43);
                const j0 = (tFrac * viewport.h) - yAnchor * textTexture.h;
                const j = clamp(0, viewport.h - textTexture.h, j0);
                yFrac = j / viewport.h;

                if (labelSide === Side.LEFT) {
                    xFrac = (viewport.w - tickSize - 2 - textTexture.w) / viewport.w;
                }
                else {
                    xFrac = (tickSize + 2) / viewport.w;
                }
            }
            else {
                const xAnchor = 0.45;
                const i0 = (tFrac * viewport.w) - xAnchor * (textTexture.w);
                const i = clamp(0, viewport.w - textTexture.w, i0);
                xFrac = i / viewport.w;

                if (labelSide === Side.BOTTOM) {
                    yFrac = (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                }
                else {
                    yFrac = (tickSize + 2) / viewport.h;
                }
            }
            textureRenderer.draw(gl, textTexture, xFrac, yFrac, { xAnchor: 0, yAnchor: 0 });
        }


        // Axis label
        //

        if (ticks.timeStructFactory) {
            const timeStructs = createTimeStructs(timeAxis, ticks.timeStructFactory, tickTimeZone, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign);
            for (let n = 0; n < timeStructs.length; n++) {
                const timeStruct = timeStructs[n];
                const text = ticks.prefixFormat(timeStruct);
                const textTexture = textTextures.value(text);

                const halfTextFrac = 0.5 * textTexture.w / viewport.w;
                const minFrac = timeAxis.tFrac(timeStruct.start_PMILLIS) - halfTextFrac;
                const maxFrac = timeAxis.tFrac(timeStruct.end_PMILLIS) + halfTextFrac;
                const tFrac = clamp(minFrac, maxFrac, timeAxis.tFrac(timeStruct.textCenter_PMILLIS));
                if (tFrac - halfTextFrac < 0 || tFrac + halfTextFrac > 1) {
                    continue;
                }

                let xFrac: number;
                let yFrac: number;
                let textOpts: TextureDrawOptions;
                if (labelSide === Side.LEFT || labelSide === Side.RIGHT) {
                    // Using hTickLabels here works out about right, even though the tick-label text is horizontal
                    const xFrac0 = 0.5 * (viewport.w - tickSize - 2 - hTickLabels) / viewport.w;
                    xFrac = (labelSide === Side.LEFT ? xFrac0 : 1 - xFrac0);
                    yFrac = tFrac;
                    textOpts = {
                        xAnchor: textTexture.yAnchor(0.5),
                        yAnchor: 0.5,
                        rotation_CCWRAD: 0.5 * Math.PI
                    };
                }
                else {
                    const yFrac0 = 0.5 * (viewport.h - tickSize - 2 - hTickLabels) / viewport.h;
                    yFrac = (labelSide === Side.BOTTOM ? yFrac0 : 1 - yFrac0);
                    xFrac = tFrac;
                    textOpts = {
                        xAnchor: 0.5,
                        yAnchor: textTexture.yAnchor(0.5),
                        rotation_CCWRAD: 0
                    };
                }
                textureRenderer.draw(gl, textTexture, xFrac, yFrac, textOpts);
            }
        }


        // Finish up
        //

        textureRenderer.end(gl);
        textTextures.retainTouched();
    };
}

function getTickDisplayData(tickInterval_MILLIS: number, referenceDate_PMILLIS: number, displayTimeZone: string, isFuturePositive: boolean, timeAxisFormat: TimeAxisFormatOptions): TickDisplayData {
    if (hasval(referenceDate_PMILLIS)) {
        return getTickDisplayDataRelative(tickInterval_MILLIS, referenceDate_PMILLIS, isFuturePositive);
    }
    else {
        return getTickDisplayDataAbsolute(tickInterval_MILLIS, displayTimeZone, timeAxisFormat);
    }
}

function getTickDisplayDataRelative(tickInterval_MILLIS: number, referenceDate_PMILLIS: number, isFuturePositive: boolean): TickDisplayData {
    let tickFormat: TickFormat = null;
    let prefixFormat: PrefixFormat = null;
    let timeStructFactory: TimeStructFactory = null;
    if (tickInterval_MILLIS <= minutesToMillis(1)) {
        tickFormat = function (tickTime_PMILLIS: number): string {
            const elapsedTime_MILLIS = Math.abs(tickTime_PMILLIS - referenceDate_PMILLIS);
            const elapsedTime_DAYS = millisToDays(elapsedTime_MILLIS);
            const elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);
            const elapsedTime_HOURS = (elapsedTime_DAYS - elapsedTime_DAYS_WHOLE) * 24;
            const elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);
            const elapsedTime_MIN = (elapsedTime_HOURS - elapsedTime_HOURS_WHOLE) * 60;
            let elapsedTime_MIN_WHOLE = Math.floor(elapsedTime_MIN);
            const elapsedTime_SEC = (elapsedTime_MIN - elapsedTime_MIN_WHOLE) * 60;
            // use round() here instead of floor() because we always expect ticks to be on even second
            // boundaries but rounding error will cause us to be somewhat unpredictably above or below
            // the nearest even second boundary
            let elapsedTime_SEC_WHOLE = Math.round(elapsedTime_SEC);
            // however the above fails when we round up to a whole minute, so special case that
            if (elapsedTime_SEC_WHOLE >= 60) {
                elapsedTime_SEC_WHOLE -= 60;
                elapsedTime_MIN_WHOLE += 1;
            }
            if (elapsedTime_MIN_WHOLE >= 60) {
                elapsedTime_MIN_WHOLE = 0;
            }

            const min: string = elapsedTime_MIN_WHOLE < 10 ? '0' + elapsedTime_MIN_WHOLE : '' + elapsedTime_MIN_WHOLE;
            const sec: string = elapsedTime_SEC_WHOLE < 10 ? '0' + elapsedTime_SEC_WHOLE : '' + elapsedTime_SEC_WHOLE;

            return min + ':' + sec;
        };

        prefixFormat = function (timeStruct: TimeStruct): string {
            const center_PMILLIS = (timeStruct.end_PMILLIS - timeStruct.start_PMILLIS) / 2 + timeStruct.start_PMILLIS;
            let elapsedTime_MILLIS = center_PMILLIS - referenceDate_PMILLIS;
            const negative = (elapsedTime_MILLIS < 0);
            const signString = (negative && isFuturePositive) || (!negative && !isFuturePositive) ? '-' : '';
            elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);

            const elapsedTime_DAYS = millisToDays(elapsedTime_MILLIS);
            const elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);
            const elapsedTime_HOURS = (elapsedTime_DAYS - elapsedTime_DAYS_WHOLE) * 24;
            const elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);

            return 'Day ' + signString + elapsedTime_DAYS_WHOLE + ' Hour ' + signString + elapsedTime_HOURS_WHOLE;
        };

        timeStructFactory = function (): TimeStruct { return new TimeStruct(); };
    }
    else if (tickInterval_MILLIS <= hoursToMillis(12)) {
        tickFormat = function (tickTime_PMILLIS: number): string {
            const elapsedTime_MILLIS = Math.abs(tickTime_PMILLIS - referenceDate_PMILLIS);
            const elapsedTime_DAYS = millisToDays(elapsedTime_MILLIS);
            const elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);
            const elapsedTime_HOURS = (elapsedTime_DAYS - elapsedTime_DAYS_WHOLE) * 24;
            let elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);
            const elapsedTime_MIN = (elapsedTime_HOURS - elapsedTime_HOURS_WHOLE) * 60;
            // use round() here instead of floor() because we always expect ticks to be on even minute
            // boundaries but rounding error will cause us to be somewhat unpredictably above or below
            // the nearest even minute boundary
            let elapsedTime_MIN_WHOLE = Math.round(elapsedTime_MIN);
            // however the above fails when we round up to a whole hour, so special case that
            if (elapsedTime_MIN_WHOLE >= 60) {
                elapsedTime_MIN_WHOLE -= 60;
                elapsedTime_HOURS_WHOLE += 1;
            }
            if (elapsedTime_HOURS_WHOLE >= 24) {
                elapsedTime_HOURS_WHOLE = 0;
            }

            const hour: string = elapsedTime_HOURS_WHOLE < 10 ? '0' + elapsedTime_HOURS_WHOLE : '' + elapsedTime_HOURS_WHOLE;
            const min: string = elapsedTime_MIN_WHOLE < 10 ? '0' + elapsedTime_MIN_WHOLE : '' + elapsedTime_MIN_WHOLE;

            return hour + ':' + min;
        };

        prefixFormat = function (timeStruct: TimeStruct): string {
            const center_PMILLIS = (timeStruct.end_PMILLIS - timeStruct.start_PMILLIS) / 2 + timeStruct.start_PMILLIS;
            let elapsedTime_MILLIS = center_PMILLIS - referenceDate_PMILLIS;
            const negative = (elapsedTime_MILLIS < 0);
            const signString = (negative && isFuturePositive) || (!negative && !isFuturePositive) ? '-' : '';
            elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
            const elapsedTime_DAYS = Math.floor(millisToDays(elapsedTime_MILLIS));
            return 'Day ' + signString + elapsedTime_DAYS;
        };

        timeStructFactory = function (): TimeStruct { return new TimeStruct(); };
    }
    else {
        tickFormat = function (tickTime_PMILLIS: number): string {
            let elapsedTime_MILLIS = tickTime_PMILLIS - referenceDate_PMILLIS;
            const negative = (elapsedTime_MILLIS < 0);
            const signString = (negative && isFuturePositive) || (!negative && !isFuturePositive) ? '-' : '';
            elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
            const elapsedTime_DAYS = Math.floor(millisToDays(elapsedTime_MILLIS));
            return elapsedTime_DAYS === 0 ? '' + elapsedTime_DAYS : signString + elapsedTime_DAYS;
        };
    }

    return <TickDisplayData>{ prefixFormat: prefixFormat, tickFormat: tickFormat, timeStructFactory: timeStructFactory };
}

function getTickDisplayDataAbsolute(tickInterval_MILLIS: number, displayTimeZone: string, timeAxisFormat: TimeAxisFormatOptions): TickDisplayData {

    let tickFormat: TickFormat = null;
    let prefixFormat: PrefixFormat = null;
    let timeStructFactory: TimeStructFactory = null;
    const defaultTickFormat = function (format: string): TickFormat { return function (tickTime_PMILLIS: number): string { return moment(tickTime_PMILLIS).zone(displayTimeZone).format(format); }; };
    const defaultPrefixFormat = function (format: string): PrefixFormat { return function (timeStruct: TimeStruct): string { return moment(timeStruct.textCenter_PMILLIS).zone(displayTimeZone).format(format); }; };

    if (tickInterval_MILLIS <= minutesToMillis(1)) {
        const formatOptions = new FormatOptions('mm:ss', 'D MMM HH:00');
        const hour = (hasval(timeAxisFormat) && hasval(timeAxisFormat.hour) ? timeAxisFormat.hour : formatOptions);
        tickFormat = defaultTickFormat((hasval(hour.tickFormat) && hour.tickFormat !== '' ? hour.tickFormat : formatOptions.tickFormat));
        prefixFormat = defaultPrefixFormat((hasval(hour.prefixFormat) && hour.prefixFormat !== '' ? hour.prefixFormat : formatOptions.prefixFormat));
        timeStructFactory = function (): TimeStruct { return new HourStruct(); };
    }
    else if (tickInterval_MILLIS <= hoursToMillis(12)) {
        const formatOptions = new FormatOptions('HH:mm', 'D MMM YYYY');
        const day = (hasval(timeAxisFormat) && hasval(timeAxisFormat.day) ? timeAxisFormat.day : formatOptions);
        tickFormat = defaultTickFormat((hasval(day.tickFormat) && day.tickFormat !== '' ? day.tickFormat : formatOptions.tickFormat));
        prefixFormat = defaultPrefixFormat((hasval(day.prefixFormat) && day.prefixFormat !== '' ? day.prefixFormat : formatOptions.prefixFormat));
        timeStructFactory = function (): TimeStruct { return new DayStruct(); };
    }
    else if (tickInterval_MILLIS <= daysToMillis(10)) {
        const formatOptions = new FormatOptions('D', 'MMM YYYY');
        const month = (hasval(timeAxisFormat) && hasval(timeAxisFormat.month) ? timeAxisFormat.month : formatOptions);
        tickFormat = defaultTickFormat((hasval(month.tickFormat) && month.tickFormat !== '' ? month.tickFormat : formatOptions.tickFormat));
        prefixFormat = defaultPrefixFormat((hasval(month.prefixFormat) && month.prefixFormat !== '' ? month.prefixFormat : formatOptions.prefixFormat));
        timeStructFactory = function (): TimeStruct { return new MonthStruct(); };
    }
    else if (tickInterval_MILLIS <= daysToMillis(60)) {
        const formatOptions = new FormatOptions('MMM', 'YYYY');
        const year = (hasval(timeAxisFormat) && hasval(timeAxisFormat.year) ? timeAxisFormat.year : formatOptions);
        tickFormat = defaultTickFormat((hasval(year.tickFormat) && year.tickFormat !== '' ? year.tickFormat : formatOptions.tickFormat));
        prefixFormat = defaultPrefixFormat((hasval(year.prefixFormat) && year.prefixFormat !== '' ? year.prefixFormat : formatOptions.prefixFormat));
        timeStructFactory = function (): TimeStruct { return new YearStruct(); };
    }
    else {
        tickFormat = defaultTickFormat('YYYY');
    }

    return <TickDisplayData>{ prefixFormat: prefixFormat, tickFormat: tickFormat, timeStructFactory: timeStructFactory };
}

interface TickDisplayData {
    prefixFormat: PrefixFormat;
    tickFormat: TickFormat;
    timeStructFactory: TimeStructFactory;
}

type PrefixFormat = (timeStruct: TimeStruct) => string;

type TickFormat = (tickTime_PMILLIS: number) => string;

type TimeStructFactory = () => TimeStruct;

class TimeStruct {
    public start_PMILLIS: number;
    public end_PMILLIS: number;
    public viewStart_PMILLIS: number;
    public viewEnd_PMILLIS: number;
    public textCenter_PMILLIS: number;

    setTime(time_PMILLIS: number, timeZone: string): Moment {
        return moment(time_PMILLIS).zone(timeZone);
    }

    incrementTime(m: Moment) {
    }
}

class YearStruct extends TimeStruct {
    setTime(time_PMILLIS: number, timeZone: string): Moment {
        const m = moment(time_PMILLIS).zone(timeZone);
        m.month(0);
        m.date(0);
        m.hours(0);
        m.minutes(0);
        m.seconds(0);
        return m;
    }

    incrementTime(m: Moment) {
        m.add('years', 1);
    }
}


class MonthStruct extends TimeStruct {
    setTime(time_PMILLIS: number, timeZone: string): Moment {
        const m = moment(time_PMILLIS).zone(timeZone);
        m.date(0);
        m.hours(0);
        m.minutes(0);
        m.seconds(0);
        return m;
    }

    incrementTime(m: Moment) {
        m.add('months', 1);
    }
}


class DayStruct extends TimeStruct {
    setTime(time_PMILLIS: number, timeZone: string): Moment {
        const m = moment(time_PMILLIS).zone(timeZone);
        m.hours(0);
        m.minutes(0);
        m.seconds(0);
        return m;
    }

    incrementTime(m: Moment) {
        m.add('days', 1);
    }
}


class HourStruct extends TimeStruct {
    setTime(time_PMILLIS: number, timeZone: string): Moment {
        const m = moment(time_PMILLIS).zone(timeZone);
        m.minutes(0);
        m.seconds(0);
        return m;
    }

    incrementTime(m: Moment) {
        m.add('hours', 1);
    }
}

function createTimeStructs(timeAxis: TimeAxis1D, factory: TimeStructFactory, timeZone: string, referenceDate_PMILLIS: number, isFuturePositive: boolean, tickTimes_PMILLIS: number[], labelAlign: number): TimeStruct[] {
    if (hasval(referenceDate_PMILLIS)) {
        const tickInterval_MILLIS = getTickInterval_MILLIS(tickTimes_PMILLIS);

        if (tickInterval_MILLIS <= minutesToMillis(1)) {
            return createTimeStructsRelativeHours(timeAxis, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign);
        }
        else {
            return createTimeStructsRelativeDays(timeAxis, referenceDate_PMILLIS, isFuturePositive, tickTimes_PMILLIS, labelAlign);
        }
    }
    else {
        return createTimeStructsAbsolute(timeAxis, factory, timeZone, tickTimes_PMILLIS, labelAlign);
    }
}


function createTimeStructsRelativeHours(timeAxis: TimeAxis1D, referenceDate_PMILLIS: number, isFuturePositive: boolean, tickTimes_PMILLIS: number[], labelAlign: number): TimeStruct[] {

    const dMin_PMILLIS = timeAxis.tMin_PMILLIS;
    const dMax_PMILLIS = timeAxis.tMax_PMILLIS;

    const timeStructs: TimeStruct[] = [];
    let maxViewDuration_MILLIS = Number.NEGATIVE_INFINITY;

    let previous_HOURS = null;
    let previous_SIGN = null;

    for (let n = 0; n < tickTimes_PMILLIS.length; n++) {

        let elapsedTime_MILLIS = tickTimes_PMILLIS[n] - referenceDate_PMILLIS;
        const negative = (elapsedTime_MILLIS < 0);
        const signString = (negative && isFuturePositive) || (!negative && !isFuturePositive) ? '-' : '';
        elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
        const elapsedTime_HOURS = millisToHours(elapsedTime_MILLIS);
        const elapsedTime_HOURS_WHOLE = Math.floor(elapsedTime_HOURS);

        if (hasval(previous_HOURS) && elapsedTime_HOURS_WHOLE === previous_HOURS && negative === previous_SIGN) {
            continue;
        }
        previous_HOURS = elapsedTime_HOURS_WHOLE;
        previous_SIGN = negative;

        const timeStruct = new TimeStruct();

        if (negative) {
            timeStruct.end_PMILLIS = hoursToMillis(-elapsedTime_HOURS_WHOLE) + referenceDate_PMILLIS;
            timeStruct.start_PMILLIS = timeStruct.end_PMILLIS - hoursToMillis(1);
        }
        else {
            timeStruct.start_PMILLIS = hoursToMillis(elapsedTime_HOURS_WHOLE) + referenceDate_PMILLIS;
            timeStruct.end_PMILLIS = timeStruct.start_PMILLIS + hoursToMillis(1);
        }

        timeStruct.viewStart_PMILLIS = clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMin_PMILLIS);
        timeStruct.viewEnd_PMILLIS = clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMax_PMILLIS);

        maxViewDuration_MILLIS = Math.max(maxViewDuration_MILLIS, timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS);

        timeStructs.push(timeStruct);
    }

    setTimeStructTextCenter(timeStructs, labelAlign, maxViewDuration_MILLIS);

    return timeStructs;
}

function createTimeStructsRelativeDays(timeAxis: TimeAxis1D, referenceDate_PMILLIS: number, isFuturePositive: boolean, tickTimes_PMILLIS: number[], labelAlign: number): TimeStruct[] {

    const dMin_PMILLIS = timeAxis.tMin_PMILLIS;
    const dMax_PMILLIS = timeAxis.tMax_PMILLIS;

    const timeStructs: TimeStruct[] = [];
    let maxViewDuration_MILLIS = Number.NEGATIVE_INFINITY;

    let previous_DAYS = null;
    let previous_SIGN = null;

    for (let n = 0; n < tickTimes_PMILLIS.length; n++) {

        let elapsedTime_MILLIS = tickTimes_PMILLIS[n] - referenceDate_PMILLIS;
        const negative = (elapsedTime_MILLIS < 0);
        const signString = (negative && isFuturePositive) || (!negative && !isFuturePositive) ? '-' : '';
        elapsedTime_MILLIS = Math.abs(elapsedTime_MILLIS);
        const elapsedTime_DAYS = millisToDays(elapsedTime_MILLIS);
        const elapsedTime_DAYS_WHOLE = Math.floor(elapsedTime_DAYS);

        if (hasval(previous_DAYS) && elapsedTime_DAYS_WHOLE === previous_DAYS && negative === previous_SIGN) {
            continue;
        }
        previous_DAYS = elapsedTime_DAYS_WHOLE;
        previous_SIGN = negative;

        const timeStruct = new TimeStruct();

        if (negative) {
            timeStruct.end_PMILLIS = daysToMillis(-elapsedTime_DAYS_WHOLE) + referenceDate_PMILLIS;
            timeStruct.start_PMILLIS = timeStruct.end_PMILLIS - daysToMillis(1);
        }
        else {
            timeStruct.start_PMILLIS = daysToMillis(elapsedTime_DAYS_WHOLE) + referenceDate_PMILLIS;
            timeStruct.end_PMILLIS = timeStruct.start_PMILLIS + daysToMillis(1);
        }

        timeStruct.viewStart_PMILLIS = clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMin_PMILLIS);
        timeStruct.viewEnd_PMILLIS = clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMax_PMILLIS);

        maxViewDuration_MILLIS = Math.max(maxViewDuration_MILLIS, timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS);

        timeStructs.push(timeStruct);
    }

    setTimeStructTextCenter(timeStructs, labelAlign, maxViewDuration_MILLIS);

    return timeStructs;
}

function createTimeStructsAbsolute(timeAxis: TimeAxis1D, factory: TimeStructFactory, timeZone: string, tickTimes_PMILLIS: number[], labelAlign: number): TimeStruct[] {
    const dMin_PMILLIS = timeAxis.tMin_PMILLIS;
    const dMax_PMILLIS = timeAxis.tMax_PMILLIS;

    const timeStructs: TimeStruct[] = [];
    let maxViewDuration_MILLIS = Number.NEGATIVE_INFINITY;

    let previous_PMILLIS: number = null;

    for (let n = 0; n < tickTimes_PMILLIS.length; n++) {
        const tickTime_PMILLIS = tickTimes_PMILLIS[n];
        const timeStruct = factory();
        const m = timeStruct.setTime(tickTime_PMILLIS, timeZone);
        const start_PMILLIS = m.valueOf();

        // XXX: Floating-point comparison can be unintuitive
        if (hasval(previous_PMILLIS) && start_PMILLIS === previous_PMILLIS) {
            continue;
        }
        previous_PMILLIS = start_PMILLIS;

        timeStruct.start_PMILLIS = start_PMILLIS;
        timeStruct.incrementTime(m);
        timeStruct.end_PMILLIS = m.valueOf();
        timeStruct.viewStart_PMILLIS = clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMin_PMILLIS);
        timeStruct.viewEnd_PMILLIS = clamp(timeStruct.start_PMILLIS, timeStruct.end_PMILLIS, dMax_PMILLIS);

        maxViewDuration_MILLIS = Math.max(maxViewDuration_MILLIS, timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS);

        timeStructs.push(timeStruct);
    }

    setTimeStructTextCenter(timeStructs, labelAlign, maxViewDuration_MILLIS);

    return timeStructs;
}

function setTimeStructTextCenter(timeStructs: TimeStruct[], labelAlign: number, maxViewDuration_MILLIS: number) {
    for (let n = 0; n < timeStructs.length; n++) {
        const timeStruct = timeStructs[n];
        const duration_MILLIS = timeStruct.viewEnd_PMILLIS - timeStruct.viewStart_PMILLIS;
        const midpoint_PMILLIS = timeStruct.viewStart_PMILLIS + labelAlign * duration_MILLIS;
        const edge_PMILLIS = (timeStruct.viewStart_PMILLIS === timeStruct.start_PMILLIS ? timeStruct.viewEnd_PMILLIS : timeStruct.viewStart_PMILLIS);
        const edginess = 1 - clamp(0, 1, duration_MILLIS / maxViewDuration_MILLIS);
        timeStruct.textCenter_PMILLIS = midpoint_PMILLIS + edginess * (edge_PMILLIS - midpoint_PMILLIS);
    }
}

export function getTickTimes_PMILLIS(timeAxis: TimeAxis1D, sizePixels: number, tickSpacing: number, timeZone: string, referenceDate_PMILLIS: number): number[] {
    if (hasval(referenceDate_PMILLIS)) {
        return getTickTimesRelative_PMILLIS(timeAxis, sizePixels, tickSpacing, referenceDate_PMILLIS);
    }
    else {
        return getTickTimesAbsolute_PMILLIS(timeAxis, sizePixels, tickSpacing, timeZone);
    }
}

function getTickTimesRelative_PMILLIS(timeAxis: TimeAxis1D, sizePixels: number, tickSpacing: number, referenceDate_PMILLIS: number): number[] {

    const dMin_PMILLIS = timeAxis.tMin_PMILLIS;
    const dMax_PMILLIS = timeAxis.tMax_PMILLIS;
    const approxTickInterval_MILLIS = tickSpacing * (dMax_PMILLIS - dMin_PMILLIS) / sizePixels;

    if (approxTickInterval_MILLIS < daysToMillis(1)) {
        return getHourTickTimesRelative_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, referenceDate_PMILLIS);
    }
    else {
        return getDayTickTimesRelative_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, sizePixels, tickSpacing, referenceDate_PMILLIS);
    }
}

function getHourTickTimesRelative_PMILLIS(dMin_PMILLIS: number, dMax_PMILLIS: number, approxTickInterval_MILLIS: number, referenceDate_PMILLIS: number): number[] {
    const tickTimes = getHourTickTimes_PMILLIS(dMin_PMILLIS - referenceDate_PMILLIS, dMax_PMILLIS - referenceDate_PMILLIS, approxTickInterval_MILLIS, 0);

    for (let n = 0; n < tickTimes.length; n++) {
        tickTimes[n] = tickTimes[n] + referenceDate_PMILLIS;
    }

    return tickTimes;
}

function getDayTickTimesRelative_PMILLIS(dMin_PMILLIS: number, dMax_PMILLIS: number, sizePixels: number, tickSpacing: number, referenceDate_PMILLIS: number): number[] {
    const axis = new Axis1D(millisToDays(dMin_PMILLIS - referenceDate_PMILLIS), millisToDays(dMax_PMILLIS - referenceDate_PMILLIS));
    const approxNumTicks = sizePixels / tickSpacing;
    const tickInterval = getTickInterval(axis, approxNumTicks);
    const tickCount = getTickCount(axis, tickInterval);
    const tickPositions = new Float32Array(tickCount);
    getTickPositions(axis, tickInterval, tickCount, tickPositions);
    const tickTimes_PMILLIS = <number[]>[];
    for (let n = 0; n < tickCount; n++) {
        tickTimes_PMILLIS.push(daysToMillis(tickPositions[n]) + referenceDate_PMILLIS);
    }
    return tickTimes_PMILLIS;
}

function getTickTimesAbsolute_PMILLIS(timeAxis: TimeAxis1D, sizePixels: number, tickSpacing: number, timeZone: string): number[] {
    const dMin_PMILLIS = timeAxis.tMin_PMILLIS;
    const dMax_PMILLIS = timeAxis.tMax_PMILLIS;

    // NOTE: moment.js reports time zone offset reversed from Java Calendar, thus the negative sign
    const mMin = moment(dMin_PMILLIS).zone(timeZone);
    const zoneOffset_MILLIS = -minutesToMillis(mMin.zone());

    const approxTickInterval_MILLIS = tickSpacing * (dMax_PMILLIS - dMin_PMILLIS) / sizePixels;

    if (approxTickInterval_MILLIS > daysToMillis(60)) {
        return getYearTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone);
    }
    else if (approxTickInterval_MILLIS > daysToMillis(10)) {
        return getMonthTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone);
    }
    else if (approxTickInterval_MILLIS > daysToMillis(1)) {
        return getDayTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, timeZone);
    }
    else {
        return getHourTickTimes_PMILLIS(dMin_PMILLIS, dMax_PMILLIS, approxTickInterval_MILLIS, zoneOffset_MILLIS);
    }
}


function getYearTickTimes_PMILLIS(dMin_PMILLIS: number, dMax_PMILLIS: number, approxTickInterval_MILLIS: number, timeZone: string): number[] {
    const m = moment(dMin_PMILLIS).zone(timeZone);

    const currentYear = m.year();
    const daysPerYear = 365.25; // assume 365.25 days in every year as a heuristic
    const approxTickInterval_YEARS = millisToDays(approxTickInterval_MILLIS) / daysPerYear;

    const yearOrderFactor = 6.0;
    const stepYears = getYearStep(approxTickInterval_YEARS * yearOrderFactor);
    const startYear = getRoundedYear(currentYear, stepYears);

    m.year(startYear).month(0).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);

    const tickTimes_PMILLIS = <number[]>[];
    while (m.valueOf() <= dMax_PMILLIS) {
        tickTimes_PMILLIS.push(m.valueOf());
        m.add('years', stepYears);
    }
    return tickTimes_PMILLIS;
}


function getYearStep(spanYears: number): number {
    const log10Span = Math.log(spanYears) / Math.LN10;
    let orderSpan = Math.floor(log10Span);
    if ((log10Span - orderSpan) > (1.0 - 1e-12)) {
        orderSpan++;
    }

    return Math.max(1, Math.pow(10, orderSpan));
}


function getRoundedYear(currentYear: number, yearStep: number): number {
    const numSteps = Math.floor(currentYear / yearStep);
    return numSteps * yearStep;
}


function getMonthTickTimes_PMILLIS(dMin_PMILLIS: number, dMax_PMILLIS: number, approxTickInterval_MILLIS: number, timeZone: string): number[] {
    const m = moment(dMin_PMILLIS).zone(timeZone).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);
    const tickTimes_PMILLIS = <number[]>[];
    while (m.valueOf() <= dMax_PMILLIS) {
        tickTimes_PMILLIS.push(m.valueOf());
        m.add('months', 1);
    }
    return tickTimes_PMILLIS;
}


function getDayTickTimes_PMILLIS(dMin_PMILLIS: number, dMax_PMILLIS: number, approxTickInterval_MILLIS: number, timeZone: string): number[] {
    const tickInterval_DAYS = calculateTickInterval_DAYS(approxTickInterval_MILLIS);

    // initialize calendar off start time and reset fields less than month
    const m = moment(dMin_PMILLIS).zone(timeZone).date(1).hours(0).minutes(0).seconds(0).milliseconds(0);

    const endTime_PMILLIS = dMax_PMILLIS + daysToMillis(tickInterval_DAYS);
    let currentMonth = m.month();

    const tickTimes_PMILLIS = <number[]>[];

    while (m.valueOf() <= endTime_PMILLIS) {
        // ensure ticks always fall on the first day of the month
        const newMonth = m.month();
        if (newMonth !== currentMonth) {
            m.date(1);
            currentMonth = newMonth;
        }

        // prevent display of ticks too close to the end of the month
        const maxDom = m.clone().endOf('month').date();
        const dom = m.date();
        if (maxDom - dom + 1 >= tickInterval_DAYS / 2) {
            tickTimes_PMILLIS.push(m.valueOf());
        }

        m.add('days', tickInterval_DAYS);
    }

    return tickTimes_PMILLIS;
}


function getHourTickTimes_PMILLIS(dMin_PMILLIS: number, dMax_PMILLIS: number, approxTickInterval_MILLIS: number, zoneOffset_MILLIS: number): number[] {
    const tickInterval_MILLIS = calculateTickInterval_MILLIS(approxTickInterval_MILLIS);

    const ticksSince1970 = Math.floor((dMin_PMILLIS + zoneOffset_MILLIS) / tickInterval_MILLIS);
    const firstTick_PMILLIS = (ticksSince1970 * tickInterval_MILLIS) - zoneOffset_MILLIS;
    const numTicks = Math.ceil(1 + (dMax_PMILLIS - firstTick_PMILLIS) / tickInterval_MILLIS);

    const tickTimes_PMILLIS = <number[]>[];
    for (let n = 0; n < numTicks; n++) {
        tickTimes_PMILLIS.push(firstTick_PMILLIS + n * tickInterval_MILLIS);
    }
    return tickTimes_PMILLIS;
}


const tickIntervalRungs_DAYS = [2, 3, 4, 5, 8, 10];


function calculateTickInterval_DAYS(approxTickInterval_MILLIS: number) {
    const approxTickInterval_DAYS = millisToDays(approxTickInterval_MILLIS);
    for (let n = 0; n < tickIntervalRungs_DAYS.length; n++) {
        if (approxTickInterval_DAYS <= tickIntervalRungs_DAYS[n]) {
            return tickIntervalRungs_DAYS[n];
        }
    }
    return 10;
}


const tickIntervalRungs_MILLIS = [secondsToMillis(1),
secondsToMillis(2),
secondsToMillis(5),
secondsToMillis(10),
secondsToMillis(15),
secondsToMillis(20),
secondsToMillis(30),
minutesToMillis(1),
minutesToMillis(2),
minutesToMillis(5),
minutesToMillis(10),
minutesToMillis(15),
minutesToMillis(20),
minutesToMillis(30),
hoursToMillis(1),
hoursToMillis(2),
hoursToMillis(3),
hoursToMillis(6),
hoursToMillis(12),
daysToMillis(1)];


function calculateTickInterval_MILLIS(approxTickInterval_MILLIS: number): number {
    for (let n = 0; n < tickIntervalRungs_MILLIS.length; n++) {
        if (approxTickInterval_MILLIS <= tickIntervalRungs_MILLIS[n]) {
            return tickIntervalRungs_MILLIS[n];
        }
    }
    return daysToMillis(1);
}


function getTickInterval_MILLIS(tickTimes_PMILLIS: number[]): number {
    if (hasval(tickTimes_PMILLIS) && tickTimes_PMILLIS.length > 1) {
        return (tickTimes_PMILLIS[1] - tickTimes_PMILLIS[0]);
    }
    else {
        return secondsToMillis(1);
    }
}



