// Values for Sudoku title
const Title = Object.freeze({
    DEFAULT: "sudoku solver",
    SOLVING: "solving..",
    SOLVED: "solved",
    NOSULUTION: "no solution!",
    INVALIDINPUT: "invalid input!",
    TIMEOUT: "timeout!"
})

// CSS id values
const CSSId = Object.freeze({
    TITLE: 'title',
    TITLE_SPACE: 'title-space',
    BOARD: 'board',

    SPEED_DISPLAY: 'speed-display',
    SPEED_REDUCER: 'speed-reducer',
    SPEED_INCREASER: 'speed-increaser',

    REDO_BUTTON: 'redo-button',
    UNDO_BUTTON: 'undo-button',
    SOLVE_BUTTON: 'solve-button',
    RESET_BUTTON: 'reset-button',
})

// CSS class values
const CSSClass = Object.freeze({
    BOARD_ROW: 'board-row',
    BLOCK_TABLE: 'block-table',
    BLOCK_ROW: 'block-row',
    CELL_SPACE: 'cell-space',

    NORMAL_CELL: 'cell',
    SELECTED_CELL: 'selected-cell',
    INVALID_CELL: 'invalid-cell',

    FASTFORWARD_BUTTON: 'fastforward-button',
    CONTROL_BUTTON: 'control-button',
})

// Possible result values after solving
const SolveResult = Object.freeze({
    SUCCESS: 1,
    NOSULUTION: 0,
    TERMINATED: -1,
    INVALIDINPUT: -2,
    TIMEOUT: -3
})

// Utility class
class Utils {
    static sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Create and returns a new matrix.
     * @returns {number[][]} A matrix of numbers.
     */
    static getNewMatrix() {
        const newMatrix = new Array(9);
        for(let i=0; i < 9; i++) {
            newMatrix[i] = new Array(9);
        }
        return newMatrix;
    }

    /**
     * Sudoku cell value change event.
     * @param {Event} event - Event object.
     */
    static sudokuValueChangeEvent(event) {
        Utils.editTitle(Title.DEFAULT)
        
        if (event.target.value != 0) {
            event.target.className = CSSClass.SELECTED_CELL;
        } else {
            event.target.className = CSSClass.NORMAL_CELL;
        }

        Sudoku.validate()
    }

    /**
     * Edit sudoku title.
     * @param {string} text - Title for sudoku.
     */
    static editTitle(text) {
        document.getElementById(CSSId.TITLE).innerText = text;
    }

    /**
     * Undo button click event handler.
     */
    static undoButtonClickHandler() {
        const matrix = StateStack.popFromLeft({ saveCurrentState: ! SolveProcess.isLocked() })
        SolveProcess.terminate()

        if (matrix) {
            Sudoku.restoreFrom(matrix)
        }
        Utils.editTitle(Title.DEFAULT)
        Utils.updateUndoRedoButtonState()
    }

    /**
     * Redo button click event handler.
     */
    static redoButtonClickHandler() {
        if (SolveProcess.isLocked()) {
            // Redo button act as fastforward button when solving in progress.
            return SolveProcess.fastForward()
        }

        const matrix = StateStack.popFromRight()

        if (matrix) {
            Sudoku.restoreFrom(matrix)
        }
        Utils.editTitle(Title.DEFAULT)
        Utils.updateUndoRedoButtonState()
    }

    /**
     * Reset button click event handler.
     */
    static resetButtonClickHandler() {
        if (! SolveProcess.isLocked()) {
            StateStack.pushCurrentState()
        }
        Sudoku.reset()
    }

    /**
     * Solve button click event handler.
     */
    static async solveButtonClickHandler() {
        if (SolveProcess.isLocked()) return
    
        const result = await SolveProcess.run()
    
        if (result === SolveResult.SUCCESS) {
            Utils.editTitle(Title.SOLVED)
        } else if (result === SolveResult.TERMINATED) {
            Utils.editTitle(Title.DEFAULT)
        } else if (result === SolveResult.INVALIDINPUT) {
            Utils.editTitle(Title.INVALIDINPUT)
        } else if (result === SolveResult.TIMEOUT) {
            Utils.editTitle(Title.TIMEOUT)
        } else {
            Utils.editTitle(Title.NOSULUTION)
        }
    }

    /**
     * Speed increase button click event handler.
     */
    static speedIncreaseButtonEvent() {
        SolveProcess.increaseSpeed()
        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
    }

    /**
     * Speed decrease button click event handler.
     */
    static speedReduceButtonEvent() {
        SolveProcess.reduceSpeed()
        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
    }

    /**
     * Speed display button click event handler.
     */
    static speedDisplayButtonEvent() {
        SolveProcess.increaseSpeed({cycle: true})
        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
    }

    /**
     * Update speed display button text.
     */
    static setSpeedDisplayText() {
        document.getElementById(CSSId.SPEED_DISPLAY).value = SolveProcess.getSpeedText()
    }

    /**
     * Convert redo button to fastforward button.
     */
    static makeFastforwardButton() {
        document.getElementById(CSSId.REDO_BUTTON).className = CSSClass.FASTFORWARD_BUTTON
        Utils.enableButton(CSSId.REDO_BUTTON)
    }

    /**
     * Convert fastforward button back to redo button.
     */
    static removeFastforwardButton() {
        document.getElementById(CSSId.REDO_BUTTON).className = CSSClass.CONTROL_BUTTON
        if (StateStack.redoStack.length === 0) {
            Utils.disableButton(CSSId.REDO_BUTTON)
        }
    }

    /**
     * Enable input button.
     * @param {number} id - ID of the html element.
     */
    static enableButton(id) {
        document.getElementById(id).disabled = false
    }

    /**
     * Disable input button.
     * @param {number} id - ID of the html element.
     */
    static disableButton(id) {
        document.getElementById(id).disabled = true
    }

    /**
     * Update state of undo and redo button by enabling/disabling.
     */
    static updateUndoRedoButtonState() {
        if (StateStack.undoStack.length === 0) {
            Utils.disableButton(CSSId.UNDO_BUTTON)
        } else {
            Utils.enableButton(CSSId.UNDO_BUTTON)
        }
        
        if (StateStack.redoStack.length === 0) {
            Utils.disableButton(CSSId.REDO_BUTTON)
        } else {
            Utils.enableButton(CSSId.REDO_BUTTON)
        }
    }

    /**
     * Update state of speed control buttons by enabling/disabling.
     */
    static updateSpeedButtonState() {
        if (SolveProcess.speedIndex === SolveProcess.speedValues.length - 1) {
            Utils.disableButton(CSSId.SPEED_INCREASER)
        } else {
            Utils.enableButton(CSSId.SPEED_INCREASER)
        }
        if (SolveProcess.speedIndex === 0) {
            Utils.disableButton(CSSId.SPEED_REDUCER)
        } else {
            Utils.enableButton(CSSId.SPEED_REDUCER)
        }
    }

}

// Class for handling all solving tasks.
class SolveProcess {
    static _isLocked = false
    static _isTerminated = false
    static _isFastForwarding = false
    static _fastForwardingStartedTime
    static _fastForwardingTimeLimit = 1000 * 5  // 5 seconds

    static speedValues = [['0.25x', 256], ['0.5x', 128], ['1x', 32], ['2x', 8], ['4x', 1]];
    static speedIndex = SolveProcess.speedValues.length - 1

    /**
     * Slows down according to the current speed
     */
    static async slowDown() {
        await Utils.sleep(
            SolveProcess.speedValues[SolveProcess.speedIndex][1]
        )
    }

    /**
     * Increaase speed
     */
    static increaseSpeed(cycle=false) {
        if (SolveProcess.speedIndex === SolveProcess.speedValues.length - 1) {
            if (cycle)
                SolveProcess.speedIndex = 0
        } else {
            SolveProcess.speedIndex += 1
        }
    }

    /**
     * Decrease speed
     */
    static reduceSpeed() {
        SolveProcess.speedIndex = Math.max(0, SolveProcess.speedIndex - 1)
    }

    /**
     * Get current speed text
     * @returns {string} Current speed value.
     */
    static getSpeedText() {
        return SolveProcess.speedValues[SolveProcess.speedIndex][0]
    }

    /**
     * Clear all settings
     */
    static clearSettings() {
        SolveProcess._isTerminated = false
        SolveProcess._isFastForwarding = false
    }

    /**
     * Lock the solve process to prevent multiple process from running at the same time 
     */
    static lock = () => {
        SolveProcess.clearSettings()
        SolveProcess._isLocked = true
        Sudoku.disableSelection()
    }

    /**
     * Unlock the solve process and make solve process available for another.
     */
    static unlock = () => {
        SolveProcess.clearSettings()
        SolveProcess._isLocked = false
        Sudoku.enableSelection()
    }

    /**
     * Check if solve process is locked.
     * @returns {boolean}
     */
    static isLocked = () => { return SolveProcess._isLocked }

    /**
     * Terminate current solve process if running.
     */
    static terminate = () => { SolveProcess._isTerminated = true }

    /**
     * Check if solve process is terminated.
     * @returns {boolean}
     */
    static isTerminated = () => { return SolveProcess._isTerminated }

    /**
     * Enable fastforwarding
     */
    static fastForward = () => {
        SolveProcess._isFastForwarding = true
        SolveProcess._fastForwardingStartedTime = performance.now()
    }

    /**
     * Check if solve process is fastforwarding
     * @returns {boolean}
     */
    static isFastForwarding = () => { return SolveProcess._isFastForwarding }

    /**
     * Check if fastforwarding of solve process ran out of time.
     * @returns {boolean}
     */
    static isTimedOut = () => {
        if ((performance.now() - SolveProcess._fastForwardingStartedTime) > SolveProcess._fastForwardingTimeLimit)  
            return true
        return false
    }

    /**
     * Start solve process.
     * @returns {keyof typeof SolveResult} 
     */
    static async run() {
        const isValid = Sudoku.validate();
        if (! isValid) return SolveResult.INVALIDINPUT

        SolveProcess.lock()

        StateStack.pushCurrentState()
        Utils.editTitle(Title.SOLVING)

        Sudoku.copyPresetValues()
        Utils.makeFastforwardButton()

        /**
         * Increment a slot/cell.
         * @returns {[number, number]} row and column of new slot/cell. 
         */
        const incrementSlot = (row, col) => {
            const incremented_col = (col + 1) % 9
            if (incremented_col == 0) {
                return [row + 1, incremented_col]
            }
            return [row, incremented_col]
        }

        /**
         * Increment slot/cell.
         * @returns {[number, number]} row and column of new slot/cell. 
         */
        const incrementNumber = (row, col) => {
            if (row === -1) return [-1, -1];
        
            if (Sudoku.sudokuPresetMatrix[row][col] === 0) {
                const value = Sudoku.getCellValue(row, col)
                if (value < 9) {
                    Sudoku.setCellValue(row, col, value + 1);
                    return [row, col]
                }
                Sudoku.setCellValue(row, col, 0)
            }
        
            if (col === 0) {
                return incrementNumber(row - 1, 8);
            }
            return incrementNumber(row, col - 1);
        }

        /**
         * Start solving sudoku.
         * @returns {keyof typeof SolveResult} 
         */
        const solveSudoku = async () => {
            let row=0, col=0;
        
            while (row < 9) {
                if (SolveProcess.isFastForwarding()) {
                    if (SolveProcess.isTimedOut()) {
                        Sudoku.restoreFrom(Sudoku.sudokuPresetMatrix)
                        return SolveResult.TIMEOUT
                    }
                } else {
                    await SolveProcess.slowDown()
                }
        
                if (SolveProcess.isTerminated()) return SolveResult.TERMINATED
        
                if (Sudoku.isSafeValue(row, col)) {
                    [row, col] = incrementSlot(row, col);
                    continue;
                }
                [row, col] = incrementNumber(row, col);
        
                if (row === -1) return SolveResult.NOSULUTION
            }
            return SolveResult.SUCCESS
        }
        const result = await solveSudoku()
        Utils.removeFastforwardButton()
        SolveProcess.unlock()
        return result
    }
}

// Class for saving and retriving states for handling undo and redo operation using stacks.
class StateStack {
    static undoStack = new Array();
    static redoStack = new Array();

    /**
     * Push current sudoku matrix to undo stack.
     * Done by solve process and reset processes.
     */
    static pushCurrentState() { 
        if (! Sudoku.isEmpty()) {
            if (StateStack.undoStack.length === 0) {
                StateStack.undoStack.push(Sudoku.getCopy());
            } else {
                const lastMatrix = StateStack.undoStack[StateStack.undoStack.length - 1];
                // Not pushing last matrix is same as the matrix to save
                if (! Sudoku.isCurrentMatrixEquals(lastMatrix)) {
                    StateStack.undoStack.push(Sudoku.getCopy());
                }
            }
        }


        // Clearing redoStack as undoStack updated
        while (StateStack.redoStack.length !== 0) {
            StateStack.redoStack.pop()
        }

        Utils.updateUndoRedoButtonState();
    }

    /**
     * Pop from undo stack. Undo operation.
     * @returns {number[][]} Sudoku matrix.
     */
    static popFromLeft({saveCurrentState = true}) {
        if (StateStack.undoStack.length === 0) return

        const len = StateStack.redoStack.length
        if (len !== 0) {
            if (Sudoku.isCurrentMatrixEquals(StateStack.redoStack[len - 1])) {
                return StateStack.undoStack.pop()
            }
        }

        if (saveCurrentState) {
            StateStack.redoStack.push(Sudoku.getCopy())
        }

        return StateStack.undoStack.pop()
    }

    /**
     * Pop from redo stack. Redo operation.
     * @returns {number[][]} Sudoku matrix.
     */
    static popFromRight() {        
        if (StateStack.redoStack.length === 0) return

        const len = StateStack.undoStack.length
        if (len !== 0) {
            if (Sudoku.isCurrentMatrixEquals(StateStack.undoStack[len - 1])) {
                return StateStack.redoStack.pop()
            }
        }

        StateStack.undoStack.push(Sudoku.getCopy())

        return StateStack.redoStack.pop()
    }
}

// Class for handling sudoku operations.
class Sudoku {
    static sudokuMatrix = Utils.getNewMatrix();
    static sudokuPresetMatrix = Utils.getNewMatrix();

    /**
     * Setup Sudoku.
     */
    static setup() {
        Sudoku.drawBoard()
        Sudoku.enableButtons()
    }

    /**
     * Setup buttons and add respective event listeners.
     */
    static enableButtons() {
        const undoButton = document.getElementById(CSSId.UNDO_BUTTON);
        undoButton.addEventListener('click', Utils.undoButtonClickHandler)

        const redoButton = document.getElementById(CSSId.REDO_BUTTON);
        redoButton.addEventListener('click', Utils.redoButtonClickHandler)

        const solveButton = document.getElementById(CSSId.SOLVE_BUTTON);
        solveButton.addEventListener('click', Utils.solveButtonClickHandler)

        const resetButton = document.getElementById(CSSId.RESET_BUTTON)
        resetButton.addEventListener('click', Utils.resetButtonClickHandler)

        const speedReducer = document.getElementById(CSSId.SPEED_REDUCER)
        speedReducer.addEventListener('click', Utils.speedReduceButtonEvent)

        const speedIncreaser = document.getElementById(CSSId.SPEED_INCREASER)
        speedIncreaser.addEventListener('click', Utils.speedIncreaseButtonEvent)

        const speedDisplay = document.getElementById(CSSId.SPEED_DISPLAY)
        speedDisplay.addEventListener('click', Utils.speedDisplayButtonEvent)

        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
        Utils.updateUndoRedoButtonState()
    }

    /**
     * Create sudoku board.
     */
    static drawBoard() {
        /* Function to create Sudoku board
        block = 3x3 cells
        board = 3x3 blocks
        +------+-----+-------+
        | cell |     |       |
        +------+     |       |
        |      block |       |
        +------------+       |
        |                    |
        |              board |
        +--------------------+
        */

        /**
         * Creates a cell, add event listeners and returns it.
         */
        function createCell(row, col) {
            const cell = document.createElement("select");
            cell.className = CSSClass.NORMAL_CELL;
            cell.id = `${row}${col}`;
            
            const defaultOption = document.createElement('option');
            defaultOption.textContent = ''
            defaultOption.value = 0
            cell.appendChild(defaultOption)

            for(let i=1; i <= 9; i++) {
                const option = document.createElement('option');
                option.textContent = i;
                option.value = i;
                cell.appendChild(option)
            }
            Sudoku.sudokuMatrix[row][col] = cell;
        
            cell.addEventListener('change', Utils.sudokuValueChangeEvent)
        
            return cell;
        }

        const title = document.createElement('h1')
        title.id = CSSId.TITLE
        title.innerText = Title.DEFAULT
        document.getElementById(CSSId.TITLE_SPACE).appendChild(title)

        const boardTable = document.getElementById(CSSId.BOARD);
        for(let c=0; c < 3; c++) {
            const boardRows = document.createElement('tr');
            boardRows.className = CSSClass.BOARD_ROW;

            for(let s=0; s < 3; s++) {
                const blockContainer = document.createElement('td');
                const blockTable = document.createElement('table');
                blockTable.className = CSSClass.BLOCK_TABLE;

                for(let r=0; r < 3; r++) {
                    const blockRows = document.createElement('tr');
                    blockRows.className = CSSClass.BLOCK_ROW

                    for(let i=0; i < 3; i++) {
                        const cellSpace = document.createElement('td');
                        cellSpace.className = CSSClass.CELL_SPACE;

                        const row = (c * 3) + r;
                        const col = (s * 3) + i;

                        cellSpace.appendChild(createCell(row, col))
                        blockRows.appendChild(cellSpace)
                    }
                    blockTable.appendChild(blockRows);
                    blockContainer.appendChild(blockTable)
                }
                boardRows.appendChild(blockContainer)
            }
            boardTable.appendChild(boardRows)
        }
    }

    /**
     * Check if a number is safe for a cell or not.
     * @returns {boolean}
     */
    static isSafeValue(row, col) {
        const number = Sudoku.getCellValue(row, col);

        if (number === 0) return false

        // Checking all rows
        for(let r=0; r < 9; r++) {
            if (r != row && Sudoku.getCellValue(r, col) === number) {
                return false
            }
        }
        // Checking all columns
        for(let c=0; c < 9; c++) {
            if (c != col && Sudoku.getCellValue(row, c) === number) {
                return false
            }
        }
        // Checking within the block
        const x = Math.floor(row / 3) * 3
        const y = Math.floor(col / 3) * 3
        for(let r=x; r < x+3; r++) {
            for(let c=y; c < y+3; c++) {
                if (r !== row || c !== col) {
                    if (Sudoku.getCellValue(r, c) === number) {
                        return false
                    }
                }
            }
        }
        return true;
    }

    /**
     * Validates the sudoku matrix and mark the cell as selected, not-selected or invalid.
     */
    static validate() {
        let isValid = true;
        for (let row=0; row < 9; row++) {
            for (let col=0; col < 9; col++) {
                if (Sudoku.getCellValue(row, col) === 0) {
                    Sudoku.sudokuMatrix[row][col].className = CSSClass.NORMAL_CELL
                } else if (Sudoku.isSafeValue(row, col)) {
                    Sudoku.sudokuMatrix[row][col].className = CSSClass.SELECTED_CELL
                } else {
                    Sudoku.sudokuMatrix[row][col].className = CSSClass.INVALID_CELL
                    isValid = false
                }
            }
        }
        return isValid
    }

    /**
     * Get cell value from the sudoku matrix.
     * @returns {number} Cell value.
     */
    static getCellValue(row, col) {
        return Number(Sudoku.sudokuMatrix[row][col].value);
    }

    /**
     * Set new value to the cell of sudoku matrix.
     */
    static setCellValue(row, col, value) {
        Sudoku.sudokuMatrix[row][col].selectedIndex = value;
    }

    /**
     * Check if current matrix is equal to given matrix.
     * @returns {boolean}.
     */
    static isCurrentMatrixEquals(matrix) {
        for(let row=0; row < 9; row++) {
            for(let col=0; col < 9; col++) {
                if (Sudoku.getCellValue(row, col) !== matrix[row][col]) {
                    return false
                }
            }
        }
        return true
    }

    /**
     * Copy the values of the sudoku matrix to preset matrix (needed for solving).
     */
    static copyPresetValues() {
        for (let row=0; row < 9; row++) {
            for (let col=0; col < 9; col++) {
                Sudoku.sudokuPresetMatrix[row][col] = Sudoku.getCellValue(row, col);
            }
        }
    }

    /**
     * Get a copy of the current sudoku matrix.
     * @returns {number[][]} Sudoku matrix.
     */
    static getCopy() {
        const newMatrix = Utils.getNewMatrix()

        for(let row=0; row < 9; row++) {
            for(let col=0; col < 9; col++) {
                newMatrix[row][col] = Sudoku.getCellValue(row, col)
            }
        }

        return newMatrix
    }

    /**
     * Check if the current sudoku matrix is empty or not.
     * @returns {boolean}.
     */
    static isEmpty() {
        for(let r=0; r < 9; r++) {
            for(let c=0; c < 9; c++) {
                if (Sudoku.getCellValue(r, c) !== 0) {
                    return false
                }
            }
        }
        return true
    }

    /**
     * Clear all the values of sudoku matrix.
     */
    static reset() {
        SolveProcess.terminate()
        for (let row=0; row < 9; row++) {
            for (let col=0; col < 9; col++) {
                Sudoku.setCellValue(row, col, 0);
            }
        }
        Sudoku.validate()
        Utils.editTitle(Title.DEFAULT)
    }

    /**
     * Disable updating of sudoku cell values.
     */
    static disableSelection() {
        for(let r=0; r < 9; r++) {
            for(let c=0; c < 9; c++) {
                Sudoku.sudokuMatrix[r][c].disabled = true;
            }
        }
    }

    /**
     * Enable updating of sudoku cell values.
     */
    static enableSelection() {
        for(let r=0; r < 9; r++) {
            for(let c=0; c < 9; c++) {
                Sudoku.sudokuMatrix[r][c].disabled = false;
            }
        }
    }

    /**
     * Restore sudoku matrix from a give matrix.
     */
    static restoreFrom(matrix) {
        for(let row=0; row < 9; row++) {
            for(let col=0; col < 9; col++) {
                Sudoku.setCellValue(row, col, matrix[row][col])
            }
        }
        Sudoku.validate()
    }

}



document.addEventListener("DOMContentLoaded", Sudoku.setup)