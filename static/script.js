const Title = Object.freeze({
    DEFAULT: "Sudoku Solver",
    SOLVING: "Solving..",
    SOLVED: "Solved",
    NOSULUTION: "No Solution!",
    INVALIDINPUT: "Invalid Input!"
})

const SolveResult = Object.freeze({
    SUCCESS: 1,
    NOSULUTION: 0,
    TERMINATED: -1,
    INVALIDINPUT: -2
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
            event.target.className = 'selected-cell';
        } else {
            event.target.className = 'cell';
        }

        Sudoku.validate()
    }

    static editTitle(text) {
        document.getElementById('title').innerText = text;
    }

    static undoButtonClickHandler() {
        SolveProcess.terminate()
        const matrix = StateStack.popFromLeft()

        if (matrix) {
            Sudoku.restoreFrom(matrix)
        }
        Utils.editTitle(Title.DEFAULT)
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
        } else {
            Utils.editTitle(Title.NOSULUTION)
        }
    }

    static makeFastforwardButton() {
        document.getElementById('redo-button').className = 'fastforward-button'
    }

    static removeFastforwardButton() {
        document.getElementById('redo-button').className = 'control-button'
    }
    
}

class SolveProcess {
    static _isLocked = false
    static _isTerminated = false
    static _isFastForwarding = false

    static clearSettings() {
        SolveProcess._isTerminated = false
        SolveProcess._isFastForwarding = false
    }

    static lock = () => {
        SolveProcess._isLocked = true
        SolveProcess.clearSettings()
        Sudoku.disableSelection()
    }
    static unlock = () => {
        SolveProcess._isLocked = false
        SolveProcess.clearSettings()
        Sudoku.enableSelection()
    }
    static isLocked = () => { return SolveProcess._isLocked }

    static terminate = () => { SolveProcess._isTerminated = true }
    static isTerminated = () => { return SolveProcess._isTerminated }

    static fastForward = () => { SolveProcess._isFastForwarding = true }
    static isFastForwarding = () => { return SolveProcess._isFastForwarding }

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
                if (! SolveProcess.isFastForwarding()) {
                    await Utils.sleep(0)
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

        if (StateStack.undoStack.length !== 0) {
            const lastMatrix = StateStack.undoStack[StateStack.undoStack.length - 1];

            if (Sudoku.isCurrentMatrixEquals(lastMatrix)) return
        }

        StateStack.undoStack.push(Sudoku.getCopy());

        // Clearing redoStack as undoStack updated
        while (StateStack.redoStack.length !== 0)
            StateStack.redoStack.pop()

    }

    static popFromLeft() {
        // Done by undo operation

        if (StateStack.undoStack.length === 0) return

        const len = StateStack.redoStack.length
        if (len !== 0) {
            if (Sudoku.isCurrentMatrixEquals(StateStack.redoStack[len - 1])) {
                return StateStack.undoStack.pop()
            }
        }

        StateStack.redoStack.push(Sudoku.getCopy())

    
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
        Sudoku.createButtons()
    }
    
    static createButtons() {
        const controlButtonSpace = document.getElementById('control-button-space');

        const undoButton = document.createElement('input');
        undoButton.id = 'undo-button'
        undoButton.type = 'button'
        undoButton.value = '<<'
        undoButton.className = "control-button"
        undoButton.addEventListener('click', Utils.undoButtonClickHandler)

        const redoButton = document.createElement('input');
        redoButton.id = 'redo-button'
        redoButton.type = 'button'
        redoButton.value = '>>'
        redoButton.className = "control-button"
        redoButton.addEventListener('click', Utils.redoButtonClickHandler)

        const solveButton = document.createElement('input');
        solveButton.id = 'solve-button'
        solveButton.type = 'button'
        solveButton.value = 'Solve'
        solveButton.className = "control-button"
        solveButton.addEventListener('click', Utils.solveButtonClickHandler)

        controlButtonSpace.appendChild(undoButton)
        controlButtonSpace.appendChild(solveButton)
        controlButtonSpace.appendChild(redoButton)

        const resetButton = document.createElement('input')
        resetButton.type = 'button'
        resetButton.value = 'reset'
        resetButton.id = 'reset-button'
        resetButton.addEventListener('click', Utils.resetButtonClickHandler)
        document.getElementById('reset-button-space').appendChild(resetButton)

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
            cell.className = 'cell';
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
        title.id = 'title'
        title.innerText = Title.DEFAULT
        document.getElementById('title-space').appendChild(title)

        const boardTable = document.getElementById('board');
        for(let c=0; c < 3; c++) {
            const boardRows = document.createElement('tr');
            boardRows.className = 'board-row';

            for(let s=0; s < 3; s++) {
                const blockContainer = document.createElement('td');
                const blockTable = document.createElement('table');
                blockTable.className = 'block-table';

                for(let r=0; r < 3; r++) {
                    const blockRows = document.createElement('tr');
                    blockRows.className = 'block-row'

                    for(let i=0; i < 3; i++) {
                        const cellSpace = document.createElement('td');
                        cellSpace.className = 'cell-space';

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
                    Sudoku.sudokuMatrix[row][col].className = 'cell'
                } else if (Sudoku.isSafeValue(row, col)) {
                    Sudoku.sudokuMatrix[row][col].className = 'selected-cell'
                } else {
                    Sudoku.sudokuMatrix[row][col].className = 'invalid-cell'
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