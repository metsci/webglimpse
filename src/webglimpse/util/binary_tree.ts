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


// AA Binary Tree
//
// see: http://user.it.uu.se/~arnea/ps/simp.pdf
//      http://en.wikipedia.org/wiki/AA_tree
//
// Tree is self-balancing. Nodes are assigned a level number to assist balancing.
//
// The following invariants hold for AA tree level numbers:
// 1) Leaf node level is 1
// 2) node.left.level = node.level - 1
// 3) node.right.level = node.level or node.right.level = node.level - 1
// 4) grandchild nodes have level less than their grandparents
// 5) every node of level greater than 1 has two children
//
// Requirements 2 and 3 allow "right horizontal links" but not "left horizontal links".
// The "skew" rotation operation turns a left horizontal link that may arise from insertion/deletion into a right horizontal link.
// The" skew" operation might result in two subsequent horizontal links (which is not permitted by requirement 4. This
// condition is fixed by the "splay" rotation operation.
//
// Duplicate values (as determined by the Comparator) are not permitted (insertion of a duplicate value will be ignored).
// Supports O(log n) insertion and deletion and O(1) size retrieval.
//
export class BinaryTree<V> {

    private _root: TreeNode<V>;
    private _comp: Comparator<V>;
    private _size: number;

    constructor(comparator: Comparator<V>) {
        this._root = null;
        this._comp = comparator;
        this._size = 0;
    }

    // Inserts the value into the tree. Nothing is inserted if the value already exists
    insert(value: V) {
        this._root = this.insert0(value, this._root);
    }

    // Removes the value from the tree (if it exists)
    remove(value: V) {
        this._root = this.remove0(value, this._root);
    }

    // Removes all values from the tree (size will be 0)
    removeAll() {
        this._root = null;
        this._size = 0;
    }

    contains(value: V): boolean {
        return this.contains0(value, this._root) !== null;
    }

    // Gets the actual value stored in the tree or null if it does not exist.
    // Normally this is not useful. This method is provided for trees which store additional
    // data in their values besides their sort order.
    getValue(value: V): V {
        return this.contains0(value, this._root);
    }

    get size(): number {
        return this._size;
    }

    get isEmpty(): boolean {
        return (this._size === 0);
    }

    // Returns the lowest element greater than or equal to the given value, or null if no such element exists
    ceiling(value: V): V {
        return this.higher0(value, this._root, true);
    }

    // Returns the greatest element less than or equal to the given value, or null if no such element exists
    floor(value: V): V {
        return this.lower0(value, this._root, true);
    }

    // Returns the greatest element strictly less than the given value, or null if no such element exists
    lower(value: V): V {
        return this.lower0(value, this._root, false);
    }

    // Returns the lowest element strictly greater than the given value, or null if no such element exists
    higher(value: V): V {
        return this.higher0(value, this._root, false);
    }

    // Returns all elements greater than (or equal to, if inclusive is true) the provided value (sorted from low to high)
    headSet(value: V, inclusive: boolean = true): V[] {
        const results: V[] = new Array<V>();
        this.head0(value, inclusive, this._root, results);
        return results;
    }

    // Returns all elements less than ( or equal to, if inclusive is true) the provided value (sorted from low to high)
    tailSet(value: V, inclusive: boolean = false): V[] {
        const results: V[] = new Array<V>();
        this.tail0(value, inclusive, this._root, results);
        return results;
    }

    // Returns all elements between the provided values (sorted from low to high)
    subSet(low: V, high: V, lowInclusive: boolean = true, highInclusive: boolean = false): V[] {
        const results: V[] = new Array<V>();
        this.sub0(low, high, lowInclusive, highInclusive, this._root, results);
        return results;
    }

    // Returns all elements in the tree (sorted from low to high)
    toArray(): V[] {
        const results: V[] = new Array<V>();
        this.addAll0(this._root, results);
        return results;
    }

    iterator(): Iterator<V> {

        // find the first node by traversing left links down the tree
        let node: TreeNode<V> = this._root;
        let down: boolean;
        const stack: TreeNode<V>[] = new Array<TreeNode<V>>();
        while (node != null && node.left != null) {
            stack.push(node);
            node = node.left;
        }
        down = node.right != null;

        return {
            next: function (): V {
                const value = node.value;

                // down indicates we should follow the right link
                if (down && node != null && node.right != null) {
                    node = node.right;
                    while (node != null && node.left != null) {
                        stack.push(node);
                        node = node.left;
                    }
                    down = node.right != null;
                }
                // up indicates the right link has been followed and we should move up to parent
                else {
                    node = stack.pop();
                    down = true;
                }

                return value;
            },
            hasNext: function (): boolean {
                return node != null;
            }
        };
    }

    compare(node1: V, node2: V): number {
        return this._comp.compare(node1, node2);
    }

    private contains0(value: V, node: TreeNode<V>): V {
        if (node == null) {
            return null;
        }

        const comp: number = this.compare(value, node.value);
        if (comp > 0) {
            return this.contains0(value, node.right);
        }
        else if (comp < 0) {
            return this.contains0(value, node.left);
        }
        else {
            return node.value;
        }
    }

    private lower0(value: V, node: TreeNode<V>, inclusive: boolean): V {
        if (node == null) {
            return null;
        }

        let comp: number = this.compare(value, node.value);
        let candidate: V;
        if (comp > 0) {
            candidate = this.lower0(value, node.right, inclusive);
            // don't need to compare again, candidate will be closer to value
            return candidate != null ? candidate : node.value;
        }
        else if (comp < 0 || (!inclusive && comp === 0)) {
            // current node's value is lower -- if we don't find a better value:
            //   * return this node's value if lower
            //   * otherwise return null
            candidate = this.lower0(value, node.left, inclusive);
            if (candidate == null) {
                candidate = node.value;
            }
            comp = this.compare(value, candidate);
            return comp > 0 || (inclusive && comp === 0) ? candidate : null;
        }
        else {
            // the node's value equals the search value and inclusive is true
            return node.value;
        }
    }

    private higher0(value: V, node: TreeNode<V>, inclusive: boolean): V {
        if (node == null) {
            return null;
        }

        let comp: number = this.compare(value, node.value);
        let candidate: V;
        if (comp < 0) {
            candidate = this.higher0(value, node.left, inclusive);
            // don't need to compare again, candidate will be closer to value
            return candidate != null ? candidate : node.value;
        }
        else if (comp > 0 || (!inclusive && comp === 0)) {
            // current node's value is lower -- if we don't find a better value:
            //   * return this node's value if higher
            //   * otherwise return null
            candidate = this.higher0(value, node.right, inclusive);
            if (candidate == null) {
                candidate = node.value;
            }
            comp = this.compare(value, candidate);
            return comp < 0 || (inclusive && comp === 0) ? candidate : null;
        }
        else {
            // the node's value equals the search value and inclusive is true
            return node.value;
        }
    }

    private sub0(low: V, high: V, lowInclusive: boolean, highInclusive: boolean, node: TreeNode<V>, results: V[]): any {
        if (node == null) {
            return;
        }

        // low end of range is above node value
        const compLow: number = this.compare(low, node.value);
        if (compLow > 0 || (compLow === 0 && !lowInclusive)) {
            return this.sub0(low, high, lowInclusive, highInclusive, node.right, results);
        }

        // high end of range is below node value
        const compHigh: number = this.compare(high, node.value);
        if (compHigh < 0 || (compHigh === 0 && !highInclusive)) {
            return this.sub0(low, high, lowInclusive, highInclusive, node.left, results);
        }

        // value is within range
        this.sub0(low, high, lowInclusive, highInclusive, node.left, results);
        results.push(node.value);
        this.sub0(low, high, lowInclusive, highInclusive, node.right, results);
    }

    private head0(value: V, inclusive: boolean, node: TreeNode<V>, results: V[]) {
        if (node == null) {
            return;
        }

        const comp: number = this.compare(value, node.value);
        if (comp < 0 || (comp === 0 && inclusive)) {
            this.head0(value, inclusive, node.left, results);
            results.push(node.value);
            this.addAll0(node.right, results);
        }
        else if (comp > 0) {
            this.head0(value, inclusive, node.right, results);
        }
    }

    private tail0(value: V, inclusive: boolean, node: TreeNode<V>, results: V[]) {
        if (node == null) {
            return;
        }

        const comp: number = this.compare(value, node.value);
        if (comp > 0 || (comp === 0 && inclusive)) {
            this.addAll0(node.left, results);
            results.push(node.value);
            this.tail0(value, inclusive, node.right, results);
        }
        else if (comp < 0) {
            this.tail0(value, inclusive, node.left, results);
        }
    }

    private addAll0(node: TreeNode<V>, results: V[]) {
        if (node == null) {
            return;
        }

        this.addAll0(node.left, results);
        results.push(node.value);
        this.addAll0(node.right, results);
    }

    // 1) turn deletion of internal node into deletion of leaf node by swapping with closest successor or predecessor
    //    (which will always be in level 1)
    // 2) lower level of nodes whose children are two levels below them (not allowed by invariants 2 and 3)
    //    also lower level of nodes who are now leaf nodes (level > 1 not allowed by invariant 1)
    // 3) skew and split the entire level
    private remove0(value: V, node: TreeNode<V>): TreeNode<V> {
        if (node == null) {
            return node;
        }

        // find and remove the node
        const comp: number = this.compare(value, node.value);
        if (comp < 0) {
            node.left = this.remove0(value, node.left);
        }
        else if (comp > 0) {
            node.right = this.remove0(value, node.right);
        }
        else {
            if (node.isLeaf()) {
                return null;
            }
            else if (node.left == null) {
                const lower = node.getSuccessor();
                node.right = this.remove0(lower.value, node.right);
                node.value = lower.value;
            }
            else {
                const lower = node.getPredecessor();
                node.left = this.remove0(lower.value, node.left);
                node.value = lower.value;
            }
            this._size -= 1;
        }

        // rebalance the tree
        node = this.decreaseLevel0(node);

        node = this.skew0(node);
        node.right = this.skew0(node.right);
        if (node.right != null) {
            node.right.right = this.skew0(node.right.right);
        }

        node = this.split0(node);
        node.right = this.split0(node.right);

        return node;
    }

    // return the level of the node, or 0 if null
    private level0(node: TreeNode<V>) {
        if (node == null) {
            return 0;
        }
        else {
            return node.level;
        }
    }

    // lower the level of nodes which violate invariants 1, 2, and/or 3
    private decreaseLevel0(node: TreeNode<V>): TreeNode<V> {
        const correctLevel = Math.min(this.level0(node.left), this.level0(node.right)) + 1;

        if (correctLevel < node.level) {
            node.level = correctLevel;
            if (node.right != null && correctLevel < node.right.level) {
                node.right.level = correctLevel;
            }
        }

        return node;
    }

    // 1) insert the value as you would in a binary tree
    // 2) walk back to the root performing skew() then split() operations
    // returns an updated version of the provided node (after the insert)
    private insert0(value: V, node: TreeNode<V>): TreeNode<V> {
        if (node == null) {
            this._size += 1;
            return this.newTreeNode0(value);
        }

        // find the appropriate spot and insert the node
        const comp: number = this.compare(value, node.value);
        if (comp < 0) {
            node.left = this.insert0(value, node.left);
        }
        else if (comp > 0) {
            node.right = this.insert0(value, node.right);
        }

        // always perform a skew then split to rebalance tree
        // (if no balancing is necessary, these operations will return the node unchanged)
        node = this.skew0(node);
        node = this.split0(node);

        return node;
    }

    newTreeNode0(value: V) {
        return new TreeNode(value);
    }

    private skew0(node: TreeNode<V>) {
        if (node == null) {
            return null;
        }
        else if (node.left == null) {
            return node;
        }
        else if (node.left.level === node.level) {
            // swap the pointers of the horizontal (same level value) left links
            const left = node.left;
            node.left = left.right;
            left.right = node;
            return left;
        }
        else {
            return node;
        }
    }

    private split0(node: TreeNode<V>) {
        if (node == null) {
            return null;
        }
        else if (node.right == null || node.right.right == null) {
            return node;
        }
        else if (node.level === node.right.right.level) {
            // two horizontal (same level value) right links
            // take the middle node, elevate it, and return it
            const right = node.right;
            node.right = right.left;
            right.left = node;
            right.level = right.level + 1;
            return right;
        }
        else {
            return node;
        }
    }
}




export class TreeNode<V> {

    private _level: number;
    private _right: TreeNode<V>;
    private _left: TreeNode<V>;
    private _value: V;

    constructor(value: V, level: number = 1, left: TreeNode<V> = null, right: TreeNode<V> = null) {
        this._level = level;
        this._right = right;
        this._left = left;
        this._value = value;
    }

    get level(): number {
        return this._level;
    }

    get right(): TreeNode<V> {
        return this._right;
    }

    get left(): TreeNode<V> {
        return this._left;
    }

    get value(): V {
        return this._value;
    }

    set right(node: TreeNode<V>) {
        this._right = node;
    }

    set left(node: TreeNode<V>) {
        this._left = node;
    }

    set level(level: number) {
        this._level = level;
    }

    set value(value: V) {
        this._value = value;
    }

    isLeaf(): boolean {
        return this.right == null && this.left == null;
    }

    getSuccessor(): TreeNode<V> {
        let node: TreeNode<V> = this.right;
        while (node != null && node.left != null) {
            node = node.left;
        }
        return node;
    }

    getPredecessor(): TreeNode<V> {
        let node: TreeNode<V> = this.left;
        while (node != null && node.right != null) {
            node = node.right;
        }
        return node;
    }

    toString(): string {
        return this.value.toString() + ':' + this.level.toString();
    }
}

export interface Iterator<V> {
    hasNext(): boolean;
    next(): V;
}

// follows Java Comparator interface contract:
// positive  if node1 > node2
// 0         if node1 = node2
// negative  if node1 < node2
export interface Comparator<V> {
    compare(node1: V, node2: V): number;
}

export class StringComparator implements Comparator<string> {
    compare(value1: string, value2: string): number {
        return value1.toLocaleLowerCase().localeCompare(value2.toLocaleLowerCase());
    }
}

export class NumberComparator implements Comparator<number> {
    compare(value1: number, value2: number): number {
        return value1 - value2;
    }
}

export function createStringTree(): BinaryTree<string> {
    return new BinaryTree(new StringComparator());
}

export function createNumberTree(): BinaryTree<number> {
    return new BinaryTree(new NumberComparator());
}
