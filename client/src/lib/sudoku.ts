// Sudoku Logic

export type GridSize = 3 | 6 | 9;
export type CellValue = number | null;
export type Grid = CellValue[][];

export function createEmptyGrid(size: GridSize): Grid {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

// Check if placing num at board[row][col] is valid
export function isValid(
  board: Grid,
  row: number,
  col: number,
  num: number,
  size: GridSize
): boolean {
  // Check row and column
  for (let i = 0; i < size; i++) {
    if (board[row][i] === num && i !== col) return false;
    if (board[i][col] === num && i !== row) return false;
  }

  // Check sub-grid (box)
  // 3x3: No sub-grids (or 1x1?) - usually 3x3 is just row/col distinct
  // 9x9: 3x3 blocks
  if (size === 9) {
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[startRow + i][startCol + j] === num && (startRow + i !== row || startCol + j !== col)) {
          return false;
        }
      }
    }
  }
  // For size 3, standard mini sudoku usually implies just row/col constraints, 
  // or it's too small to have meaningful subgrids other than 1x1 which is redundant.
  
  return true;
}

// Backtracking Solver
export async function solveSudoku(
  board: Grid, 
  size: GridSize,
  delay: number = 0,
  onUpdate?: (board: Grid) => void
): Promise<Grid | false> {
  const emptySpot = findEmpty(board, size);
  if (!emptySpot) return board; // Solved

  const [row, col] = emptySpot;

  for (let num = 1; num <= size; num++) {
    if (isValid(board, row, col, num, size)) {
      board[row][col] = num;
      
      if (delay > 0 && onUpdate) {
        onUpdate([...board.map(r => [...r])]); // Clone
        await new Promise(r => setTimeout(r, delay));
      }

      const result = await solveSudoku(board, size, delay, onUpdate);
      if (result) return result;

      board[row][col] = null; // Backtrack
      if (delay > 0 && onUpdate) {
        onUpdate([...board.map(r => [...r])]); 
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return false;
}

function findEmpty(board: Grid, size: GridSize): [number, number] | null {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === null) return [r, c];
    }
  }
  return null;
}

export function validateBoard(board: Grid, size: GridSize): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = board[r][c];
      if (val !== null) {
        // Temporarily clear to check validity
        board[r][c] = null;
        const valid = isValid(board, r, c, val, size);
        board[r][c] = val; // Restore
        if (!valid) return false;
      }
    }
  }
  return true;
}
