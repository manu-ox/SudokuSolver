const Title = Object.freeze({
    DEFAULT: "sudoku solver",
    SOLVING: "solving..",
    SOLVED: "solved",
    NOSULUTION: "no solution!",
    INVALIDINPUT: "invalid input!",
    TIMEOUT: "timeout!"
})

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

const SolveResult = Object.freeze({
    SUCCESS: 1,
    NOSULUTION: 0,
    TERMINATED: -1,
    INVALIDINPUT: -2,
    TIMEOUT: -3
})


class Utils {
    static sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    static getNewMatrix() {
        const newMatrix = new Array(9);
        for(let i=0; i < 9; i++) {
            newMatrix[i] = new Array(9);
        }
        return newMatrix;
    }

    static sudokuValueChangeEvent(event) {
        Utils.editTitle(Title.DEFAULT)
        
        if (event.target.value != 0) {
            event.target.className = CSSClass.SELECTED_CELL;
        } else {
            event.target.className = CSSClass.NORMAL_CELL;
        }

        Sudoku.validate()
    }

    static editTitle(text) {
        document.getElementById(CSSId.TITLE).innerText = text;
    }

    static undoButtonClickHandler() {
        const matrix = StateStack.popFromLeft({ saveCurrentState: ! SolveProcess.isLocked() })
        SolveProcess.terminate()

        if (matrix) {
            Sudoku.restoreFrom(matrix)
        }
        Utils.editTitle(Title.DEFAULT)
        Utils.updateUndoRedoButtonState()
    }
    static redoButtonClickHandler() {
        // Redo button act as fastforward button when solving in progress.
        if (SolveProcess.isLocked()) {
            return SolveProcess.fastForward()
        }

        const matrix = StateStack.popFromRight()

        if (matrix) {
            Sudoku.restoreFrom(matrix)
        }
        Utils.editTitle(Title.DEFAULT)
        Utils.updateUndoRedoButtonState()
    }
    static resetButtonClickHandler() {
        if (! SolveProcess.isLocked()) {
            StateStack.pushCurrentState()
        }
        Sudoku.reset()
    }

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

    static speedIncreaseButtonEvent() {
        SolveProcess.increaseSpeed()
        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
    }
    static speedReduceButtonEvent() {
        SolveProcess.reduceSpeed()
        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
    }
    static speedDisplayButtonEvent() {
        SolveProcess.increaseSpeed({cycle: true})
        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
    }

    static setSpeedDisplayText() {
        document.getElementById(CSSId.SPEED_DISPLAY).value = SolveProcess.getSpeedText()
    }

    static makeFastforwardButton() {
        document.getElementById(CSSId.REDO_BUTTON).className = CSSClass.FASTFORWARD_BUTTON
        Utils.enableButton(CSSId.REDO_BUTTON)
    }

    static removeFastforwardButton() {
        document.getElementById(CSSId.REDO_BUTTON).className = CSSClass.CONTROL_BUTTON
        if (StateStack.redoStack.length === 0) {
            Utils.disableButton(CSSId.REDO_BUTTON)
        }
    }

    static enableButton(id) {
        document.getElementById(id).disabled = false
    }

    static disableButton(id) {
        document.getElementById(id).disabled = true
    }

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

class SolveProcess {
    static _isLocked = false
    static _isTerminated = false
    static _isFastForwarding = false
    static _fastForwardingStartedTime
    static _fastForwardingTimeLimit = 1000 * 5  // 5 seconds

    static speedValues = [['0.25x', 256], ['0.5x', 128], ['1x', 32], ['2x', 8], ['4x', 1]];
    static speedIndex = SolveProcess.speedValues.length - 1

    static async slowDown() {
        await Utils.sleep(
            SolveProcess.speedValues[SolveProcess.speedIndex][1]
        )
    }

    static increaseSpeed(cycle=false) {
        if (SolveProcess.speedIndex === SolveProcess.speedValues.length - 1) {
            if (cycle)
                SolveProcess.speedIndex = 0
        } else {
            SolveProcess.speedIndex += 1
        }
    }

    static reduceSpeed() {
        SolveProcess.speedIndex = Math.max(0, SolveProcess.speedIndex - 1)
    }

    static getSpeedText() {
        return SolveProcess.speedValues[SolveProcess.speedIndex][0]
    }

    static clearSettings() {
        SolveProcess._isTerminated = false
        SolveProcess._isFastForwarding = false
    }

    static lock = () => {
        SolveProcess.clearSettings()
        SolveProcess._isLocked = true
        Sudoku.disableSelection()
    }
    static unlock = () => {
        SolveProcess.clearSettings()
        SolveProcess._isLocked = false
        Sudoku.enableSelection()
    }
    static isLocked = () => { return SolveProcess._isLocked }

    static terminate = () => { SolveProcess._isTerminated = true }
    static isTerminated = () => { return SolveProcess._isTerminated }

    static fastForward = () => {
        SolveProcess._isFastForwarding = true
        SolveProcess._fastForwardingStartedTime = performance.now()
    }
    static isFastForwarding = () => { return SolveProcess._isFastForwarding }

    static isTimedOut = () => {
        if ((performance.now() - SolveProcess._fastForwardingStartedTime) > SolveProcess._fastForwardingTimeLimit)  
            return true
        return false
    }

    static async run() {
        const isValid = Sudoku.validate();
        if (! isValid) return SolveResult.INVALIDINPUT

        SolveProcess.lock()

        StateStack.pushCurrentState()
        Utils.editTitle(Title.SOLVING)

        Sudoku.copyPresetValues()
        Utils.makeFastforwardButton()

        const incrementSlot = (row, col) => {
            const incremented_col = (col + 1) % 9
            if (incremented_col == 0) {
                return [row + 1, incremented_col]
            }
            return [row, incremented_col]
        }

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

class StateStack {
    static undoStack = new Array();
    static redoStack = new Array();

    static pushCurrentState() { 
        // Done by solve and reset processes

        if (StateStack.undoStack.length === 0) {
            StateStack.undoStack.push(Sudoku.getCopy());
        } else {
            const lastMatrix = StateStack.undoStack[StateStack.undoStack.length - 1];
            // Not pushing same matrix
            if (! Sudoku.isCurrentMatrixEquals(lastMatrix)) {
                StateStack.undoStack.push(Sudoku.getCopy());
            }
        }

        // Clearing redoStack as undoStack updated
        while (StateStack.redoStack.length !== 0) {
            StateStack.redoStack.pop()
        }

        Utils.updateUndoRedoButtonState();
    }

    static popFromLeft({saveCurrentState = true}) {
        // Done by undo operation

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

    static popFromRight() {
        // Done by redo operation
        
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

class Sudoku {
    static sudokuMatrix = Utils.getNewMatrix();
    static sudokuPresetMatrix = Utils.getNewMatrix();

    static setup() {
        Sudoku.drawBoard()
        Sudoku.enableButtons()
        Utils.setSpeedDisplayText()
        Utils.updateSpeedButtonState()
        Utils.updateUndoRedoButtonState()
    }
    
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
    }

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

    static getCellValue(row, col) {
        return Number(Sudoku.sudokuMatrix[row][col].value);
    }

    static setCellValue(row, col, value) {
        Sudoku.sudokuMatrix[row][col].selectedIndex = value;
    }

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

    static copyPresetValues() {
        for (let row=0; row < 9; row++) {
            for (let col=0; col < 9; col++) {
                Sudoku.sudokuPresetMatrix[row][col] = Sudoku.getCellValue(row, col);
            }
        }
    }

    static getCopy() {
        const newMatrix = Utils.getNewMatrix()

        for(let row=0; row < 9; row++) {
            for(let col=0; col < 9; col++) {
                newMatrix[row][col] = Sudoku.getCellValue(row, col)
            }
        }

        return newMatrix
    }

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

    static disableSelection() {
        for(let r=0; r < 9; r++) {
            for(let c=0; c < 9; c++) {
                Sudoku.sudokuMatrix[r][c].disabled = true;
            }
        }
    }

    static enableSelection() {
        for(let r=0; r < 9; r++) {
            for(let c=0; c < 9; c++) {
                Sudoku.sudokuMatrix[r][c].disabled = false;
            }
        }
    }

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