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
import { TimelineUi } from './timeline_ui';
import { TimelineRowModel, TimelineModel, TimelineEventModel } from './timeline_model';
import { StringMap, order, formatTime_ISO8601, hasval } from '../util/util';
import { Listener } from '../util/notification';
import { indexAfter, indexBefore, indexAtOrAfter } from '../util/sorted_arrays';

export class TimelineLaneArray {
    private _ui: TimelineUi;
    private _row: TimelineRowModel;
    private _lanes: TimelineLane[];
    private _laneNums: StringMap<number>;

    private _rebuildLanesMouseWheel: () => void;
    private _rebuildLanes: () => void;
    private _newEvent: (eventGuid: string) => void;
    private _addEvent: (eventGuid: string) => void;
    private _removeEvent: (eventGuid: string) => void;

    private _model: TimelineModel;

    // Keep references to listeners, so that we can remove them later
    private _eventAttrsListeners: StringMap<Listener>;

    constructor(model: TimelineModel, row: TimelineRowModel, ui: TimelineUi, allowMultipleLanes: boolean) {
        this._model = model;
        this._row = row;
        this._ui = ui;

        this._lanes = [];
        this._laneNums = {};
        this._eventAttrsListeners = {};

        const self = this;

        function findAvailableLaneNum(event: TimelineEventModel, startLaneNum: number, endLaneNum: number): number {
            for (let n = startLaneNum; n < endLaneNum; n++) {
                if (self._lanes[n].couldFitEvent(event)) {
                    return n;
                }
            }
            return null;
        }

        function firstAvailableLaneNum(event: TimelineEventModel): number {
            const laneNum = findAvailableLaneNum(event, 0, self._lanes.length);
            return (hasval(laneNum) ? laneNum : self._lanes.length);
        }

        function addEventToLane(event: TimelineEventModel, laneNum: number) {
            if (!self._lanes[laneNum]) {
                self._lanes[laneNum] = allowMultipleLanes ? new TimelineLaneStack(ui) : new TimelineLaneSimple(ui);
            }
            self._lanes[laneNum].add(event);
            self._laneNums[event.eventGuid] = laneNum;
        }

        function fillVacancy(vacancyLaneNum: number, vacancyEdges_PMILLIS: number[]) {
            const vacancyLane = self._lanes[vacancyLaneNum];
            for (let n = vacancyLaneNum + 1; n < self._lanes.length; n++) {
                const lane = self._lanes[n];
                const possibleTenants = lane.collisionsWithInterval(vacancyEdges_PMILLIS[0], vacancyEdges_PMILLIS[1]);
                for (let p = 0; p < possibleTenants.length; p++) {
                    const event = possibleTenants[p];
                    if (vacancyLane.couldFitEvent(event)) {
                        lane.remove(event);
                        addEventToLane(event, vacancyLaneNum);
                        fillVacancy(n, effectiveEdges_PMILLIS(ui, event));
                    }
                }
            }
        }

        function trimEmptyLanes() {
            for (let n = self._lanes.length - 1; n >= 0; n--) {
                if (self._lanes[n].isEmpty()) {
                    self._lanes.splice(n, 1);
                }
                else {
                    break;
                }
            }
        }

        // adds event to lane, may be called multiple times
        this._addEvent = function (eventGuid: string) {
            if (hasval(self._laneNums[eventGuid])) {
                throw new Error('Lanes-array already contains this event: row-guid = ' + row.rowGuid + ', lane = ' + self._laneNums[eventGuid] + ', event-guid = ' + eventGuid);
            }
            const event = model.event(eventGuid);
            const laneNum = firstAvailableLaneNum(event);
            addEventToLane(event, laneNum);
        };

        row.eventGuids.forEach(this._addEvent);
        row.eventGuids.valueAdded.on(this._addEvent);

        // attaches listeners to event, should be called only once
        // when an event is first added to the row model
        this._newEvent = function (eventGuid: string) {
            const event = model.event(eventGuid);
            let oldEdges_PMILLIS = effectiveEdges_PMILLIS(ui, event);
            const updateLaneAssignment = function () {
                const newEdges_PMILLIS = effectiveEdges_PMILLIS(ui, event);
                if (newEdges_PMILLIS[0] !== oldEdges_PMILLIS[0] || newEdges_PMILLIS[1] !== oldEdges_PMILLIS[1]) {
                    const oldLaneNum = self._laneNums[event.eventGuid];
                    const oldLane = self._lanes[oldLaneNum];

                    const betterLaneNum = findAvailableLaneNum(event, 0, oldLaneNum);
                    if (hasval(betterLaneNum)) {
                        // Move to a better lane
                        oldLane.remove(event);
                        addEventToLane(event, betterLaneNum);
                    }
                    else if (oldLane.eventStillFits(event)) {
                        // Stay in the current lane
                        oldLane.update(event);
                    }
                    else {
                        // Take whatever lane we can get
                        let newLaneNum = findAvailableLaneNum(event, oldLaneNum + 1, self._lanes.length);
                        if (!hasval(newLaneNum)){
                            newLaneNum = self._lanes.length;
                        }
                        oldLane.remove(event);
                        addEventToLane(event, newLaneNum);
                    }

                    fillVacancy(oldLaneNum, oldEdges_PMILLIS);
                    trimEmptyLanes();

                    oldEdges_PMILLIS = newEdges_PMILLIS;
                }
            };

            event.attrsChanged.on(updateLaneAssignment);
            self._eventAttrsListeners[eventGuid] = updateLaneAssignment;
        };
        row.eventGuids.forEach(this._newEvent);
        row.eventGuids.valueAdded.on(this._newEvent);

        this._removeEvent = function (eventGuid: string) {
            const event = model.event(eventGuid);

            const oldLaneNum = self._laneNums[eventGuid];
            delete self._laneNums[eventGuid];

            self._lanes[oldLaneNum].remove(event);
            fillVacancy(oldLaneNum, effectiveEdges_PMILLIS(ui, event));
            trimEmptyLanes();

            event.attrsChanged.off(self._eventAttrsListeners[eventGuid]);
            delete self._eventAttrsListeners[eventGuid];
        };
        row.eventGuids.valueRemoved.on(this._removeEvent);

        self._rebuildLanes = function () {
            const oldLanes = self._lanes;
            self._lanes = [];
            self._laneNums = {};

            for (let l = 0; l < oldLanes.length; l++) {
                const lane = oldLanes[l];
                for (let e = 0; e < lane.length; e++) {
                    const event = lane.event(e);
                    self._addEvent(event.eventGuid);
                }
            }
        };

        const hasIcons = function () {
            const oldLanes = self._lanes;
            for (let l = 0; l < oldLanes.length; l++) {
                const lane = oldLanes[l];
                for (let e = 0; e < lane.length; e++) {
                    const event = lane.event(e);
                    const style = ui.eventStyle(event.styleGuid);
                    if (event.labelIcon || style.numIcons > 0) {
                        return true;
                    }
                }
            }
            return false;
        };

        self._rebuildLanesMouseWheel = function () {
            if (hasIcons()) {
                self._rebuildLanes();
            }
        };

        ui.millisPerPx.changed.on(self._rebuildLanesMouseWheel);
        ui.eventStyles.valueAdded.on(self._rebuildLanes);
        ui.eventStyles.valueRemoved.on(self._rebuildLanes);
    }

    get length(): number {
        return this._lanes.length;
    }

    lane(index: number): TimelineLane {
        return this._lanes[index];
    }

    get numEvents(): number {
        return this._row.eventGuids.length;
    }

    eventAt(laneNum: number, time_PMILLIS: number): TimelineEventModel {
        const lane = this._lanes[laneNum];
        return (lane && lane.eventAtTime(time_PMILLIS));
    }

    dispose(): void {
        this._row.eventGuids.valueAdded.off(this._addEvent);
        this._row.eventGuids.valueRemoved.off(this._removeEvent);
        this._row.eventGuids.valueAdded.off(this._newEvent);

        this._ui.millisPerPx.changed.off(this._rebuildLanesMouseWheel);
        this._ui.eventStyles.valueAdded.off(this._rebuildLanes);
        this._ui.eventStyles.valueRemoved.off(this._rebuildLanes);

        for (const eventGuid in this._eventAttrsListeners) {
            if (this._eventAttrsListeners.hasOwnProperty(eventGuid)) {
                const listener = this._eventAttrsListeners[eventGuid];
                const event = this._model.event(eventGuid);
                if (listener && event) {
                    event.attrsChanged.off(listener);
                }
            }
        }
    }
}



export function effectiveEdges_PMILLIS(ui: TimelineUi, event: TimelineEventModel): number[] {
    let start_PMILLIS = event.start_PMILLIS;
    let end_PMILLIS = event.end_PMILLIS;

    const millisPerPx = ui.millisPerPx.value;
    const eventStyle = ui.eventStyle(event.styleGuid);
    for (let n = 0; n < eventStyle.numIcons; n++) {
        const icon = eventStyle.icon(n);
        const iconTime_PMILLIS = event.start_PMILLIS + icon.hPos * (event.end_PMILLIS - event.start_PMILLIS);
        const iconStart_PMILLIS = iconTime_PMILLIS - (millisPerPx * icon.hAlign * icon.displayWidth);
        const iconEnd_PMILLIS = iconTime_PMILLIS + (millisPerPx * (1 - icon.hAlign) * icon.displayWidth);

        start_PMILLIS = Math.trunc(Math.min(start_PMILLIS, iconStart_PMILLIS));
        end_PMILLIS = Math.trunc(Math.max(end_PMILLIS, iconEnd_PMILLIS));
    }

    return [start_PMILLIS, end_PMILLIS];
}


export interface TimelineLane {
    length: number;
    event(index: number): TimelineEventModel;
    isEmpty(): boolean;
    eventAtTime(time_PMILLIS: number): TimelineEventModel;
    add(event: TimelineEventModel): void;
    remove(event: TimelineEventModel): void;
    eventStillFits(event: TimelineEventModel): boolean;
    update(event: TimelineEventModel): void;
    collisionsWithInterval(start_PMILLIS: number, end_PMILLIS: number): TimelineEventModel[];
    couldFitEvent(event: TimelineEventModel): boolean;
}

// a TimelineLane where no events start/end time overlap
export class TimelineLaneStack implements TimelineLane {
    private _events: TimelineEventModel[];
    private _starts_PMILLIS: number[];
    private _ends_PMILLIS: number[];
    private _indices: StringMap<number>;
    private _ui: TimelineUi;

    constructor(ui: TimelineUi) {
        this._events = [];
        this._starts_PMILLIS = [];
        this._ends_PMILLIS = [];
        this._indices = {};
        this._ui = ui;
    }

    get length(): number {
        return this._events.length;
    }

    event(index: number): TimelineEventModel {
        return this._events[index];
    }

    isEmpty(): boolean {
        return (this._events.length === 0);
    }

    eventAtTime(time_PMILLIS: number): TimelineEventModel {
        if (hasval(time_PMILLIS)) {
            // Check the first event ending after time
            const iFirst = indexAfter(this._ends_PMILLIS, time_PMILLIS);
            if (iFirst < this._events.length) {
                const eventFirst = this._events[iFirst];
                const startFirst_PMILLIS = effectiveEdges_PMILLIS(this._ui, eventFirst)[0];
                if (time_PMILLIS >= startFirst_PMILLIS) {
                    return eventFirst;
                }
            }
            // Check the previous event, in case we're in its icon-slop
            const iPrev = iFirst - 1;
            if (iPrev >= 0) {
                const eventPrev = this._events[iPrev];
                const endPrev_PMILLIS = effectiveEdges_PMILLIS(this._ui, eventPrev)[1];
                if (time_PMILLIS < endPrev_PMILLIS) {
                    return eventPrev;
                }
            }
        }
        return null;
    }

    add(event: TimelineEventModel) {
        const eventGuid = event.eventGuid;
        if (hasval(this._indices[eventGuid])) {
            throw new Error('Lane already contains this event: event = ' + formatEvent(event));
        }

        const i = indexAfter(this._starts_PMILLIS, event.start_PMILLIS);
        if (!this._eventFitsBetween(event, i - 1, i)) {
            throw new Error('New event does not fit between existing events: new = ' + formatEvent(event) + ', before = ' + formatEvent(this._events[i - 1]) + ', after = ' + formatEvent(this._events[i]));
        }

        this._events.splice(i, 0, event);
        this._starts_PMILLIS.splice(i, 0, event.start_PMILLIS);
        this._ends_PMILLIS.splice(i, 0, event.end_PMILLIS);
        this._indices[eventGuid] = i;

        for (let n = i; n < this._events.length; n++) {
            this._indices[this._events[n].eventGuid] = n;
        }
    }

    remove(event: TimelineEventModel) {
        const eventGuid = event.eventGuid;
        const i = this._indices[eventGuid];
        if (!hasval(i)) {
            throw new Error('Event not found in this lane: event = ' + formatEvent(event));
        }

        this._events.splice(i, 1);
        this._starts_PMILLIS.splice(i, 1);
        this._ends_PMILLIS.splice(i, 1);
        delete this._indices[eventGuid];

        for (let n = i; n < this._events.length; n++) {
            this._indices[this._events[n].eventGuid] = n;
        }
    }

    eventStillFits(event: TimelineEventModel): boolean {
        const i = this._indices[event.eventGuid];
        if (!hasval(i)) {
            throw new Error('Event not found in this lane: event = ' + formatEvent(event));
        }

        return this._eventFitsBetween(event, i - 1, i + 1);
    }

    update(event: TimelineEventModel) {
        const i = this._indices[event.eventGuid];
        if (!hasval(i)) {
            throw new Error('Event not found in this lane: event = ' + formatEvent(event));
        }

        this._starts_PMILLIS[i] = event.start_PMILLIS;
        this._ends_PMILLIS[i] = event.end_PMILLIS;
    }

    collisionsWithInterval(start_PMILLIS: number, end_PMILLIS: number): TimelineEventModel[] {
        // Find the first event ending after start
        let iFirst = indexAfter(this._ends_PMILLIS, start_PMILLIS);
        const iPrev = iFirst - 1;
        if (iPrev >= 0) {
            const endPrev_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iPrev])[1];
            if (start_PMILLIS < endPrev_PMILLIS) {
                iFirst = iPrev;
            }
        }
        // Find the last event starting before end
        let iLast = indexBefore(this._starts_PMILLIS, end_PMILLIS);
        const iPost = iLast + 1;
        if (iPost < this._events.length) {
            const startPost_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iPost])[0];
            if (end_PMILLIS > startPost_PMILLIS) {
                iLast = iPost;
            }
        }
        // Return that section
        return this._events.slice(iFirst, iLast + 1);
    }

    couldFitEvent(event: TimelineEventModel): boolean {
        const iAfter = indexAfter(this._starts_PMILLIS, event.start_PMILLIS);
        const iBefore = iAfter - 1;
        return this._eventFitsBetween(event, iBefore, iAfter);
    }

    _eventFitsBetween(event: TimelineEventModel, iBefore: number, iAfter: number): boolean {
        const edges_PMILLIS = effectiveEdges_PMILLIS(this._ui, event);

        if (iBefore >= 0) {
            // Comparing one start-time (inclusive) and one end-time (exclusive), so equality means no collision
            const edgesBefore_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iBefore]);
            if (edges_PMILLIS[0] < edgesBefore_PMILLIS[1]) {
                return false;
            }
        }

        if (iAfter < this._events.length) {
            // Comparing one start-time (inclusive) and one end-time (exclusive), so equality means no collision
            const edgesAfter_PMILLIS = effectiveEdges_PMILLIS(this._ui, this._events[iAfter]);
            if (edges_PMILLIS[1] > edgesAfter_PMILLIS[0]) {
                return false;
            }
        }

        return true;
    }
}

// a TimelineLane where events are allowed to overlap arbitrarily
// because of this assumptions like the index for an event in the _starts_PMILLIS
// and _ends_PMILLIS arrays being the same no longer hold
//
// does not make any assumptions about event overlapping and uses
// an inefficient O(n) brute force search to find events (an interval tree
// would be needed for efficient search in the general case)
export class TimelineLaneSimple implements TimelineLane {

    private _events: TimelineEventModel[];
    private _orders: number[];
    private _ids: StringMap<any>;
    private _ui: TimelineUi;

    constructor(ui: TimelineUi) {
        this._events = [];
        this._orders = [];
        this._ids = {};
        this._ui = ui;
    }

    get length(): number {
        return this._events.length;
    }

    event(index: number): TimelineEventModel {
        return this._events[index];
    }

    isEmpty(): boolean {
        return (this._events.length === 0);
    }

    eventAtTime(time_PMILLIS: number): TimelineEventModel {

        let bestEvent: TimelineEventModel;

        // start at end of events list so that eventAtTime result
        // favors events drawn on top (in cases where events are unordered
        // those that happen to be at end end of the list are drawn last
        for (let n = this._events.length - 1; n >= 0; n--) {
            const event: TimelineEventModel = this._events[n];

            const eventEdges_PMILLIS = effectiveEdges_PMILLIS(this._ui, event);

            if (time_PMILLIS > eventEdges_PMILLIS[0] &&
                time_PMILLIS < eventEdges_PMILLIS[1] &&
                (bestEvent === undefined || bestEvent.order < event.order)) {
                bestEvent = event;
            }
        }

        return bestEvent;
    }

    add(event: TimelineEventModel) {
        const eventGuid = event.eventGuid;
        if (hasval(this._ids[eventGuid])) {
            throw new Error('Lane already contains this event: event = ' + formatEvent(event));
        }

        // for events with undefined order, replace with largest possible negative order so sort is correct
        const orderVal = hasval(event.order) ? event.order : Number.NEGATIVE_INFINITY;

        const i: number = indexAtOrAfter(this._orders, orderVal);

        this._ids[eventGuid] = eventGuid;
        this._orders.splice(i, 0, orderVal);
        this._events.splice(i, 0, event);
    }

    remove(event: TimelineEventModel) {
        const eventGuid = event.eventGuid;
        if (!hasval(this._ids[eventGuid])) {
            throw new Error('Event not found in this lane: event = ' + formatEvent(event));
        }

        delete this._ids[eventGuid];
        const i: number = this._getIndex(event);
        this._orders.splice(i, 1);
        this._events.splice(i, 1);
    }

    update(event: TimelineEventModel) {
        this.remove(event);
        this.add(event);
    }

    collisionsWithInterval(start_PMILLIS: number, end_PMILLIS: number): TimelineEventModel[] {

        const results = [];

        for (let n = 0; n < this._events.length; n++) {
            const event: TimelineEventModel = this._events[n];

            if (!(start_PMILLIS > event.end_PMILLIS || end_PMILLIS < event.start_PMILLIS)) {
                results.push(event);
            }
        }

        return results;
    }

    // we can always fit more events because overlaps are allowed
    eventStillFits(event: TimelineEventModel): boolean {
        return true;
    }

    // we can always fit more events because overlaps are allowed
    couldFitEvent(event: TimelineEventModel): boolean {
        return true;
    }

    _getIndex(queryEvent: TimelineEventModel): number {
        for (let n = 0; n < this._events.length; n++) {
            const event: TimelineEventModel = this._events[n];
            if (queryEvent.eventGuid === event.eventGuid) {
                return n;
            }
        }
        throw new Error('Event not found in this lane: event = ' + formatEvent(queryEvent));
    }
}

function formatEvent(event: TimelineEventModel): string {
    if (!hasval(event)) {
        return '' + event;
    }
    else {
        return (event.label + ' [ ' + formatTime_ISO8601(event.start_PMILLIS) + ' ... ' + formatTime_ISO8601(event.end_PMILLIS) + ' ]');
    }
}
