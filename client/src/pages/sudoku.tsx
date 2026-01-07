import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Loader2, RotateCcw, Play, Eraser, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Grid, GridSize, CellValue, createEmptyGrid, solveSudoku, validateBoard } from "@/lib/sudoku";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SPEEDS = {
  INSTANT: 0,
  FAST: 10,
  SLOW: 50,
};

export default function SudokuPage() {
  const [size, setSize] = useState<GridSize>(9);
  const [grid, setGrid] = useState<Grid>(createEmptyGrid(9));
  const [initialGrid, setInitialGrid] = useState<Grid>(createEmptyGrid(9)); // To track user inputs vs solved
  const [isSolving, setIsSolving] = useState(false);
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleModeChange = (newSize: GridSize) => {
    setSize(newSize);
    const newGrid = createEmptyGrid(newSize);
    setGrid(newGrid);
    setInitialGrid(newGrid);
    setSolved(false);
    setError(null);
    setIsSolving(false);
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    if (isSolving) return;
    
    // reset solved state if user edits
    if (solved) {
        setSolved(false);
        // We want to keep the current grid as the new "initial" basis? 
        // No, usually if they edit a solved grid, they are just tweaking. 
        // But for "Solver" app, usually you enter the problem, then solve.
        // If solved, let's just clear the "solved" flag but keep the numbers.
    }

    const num = value === "" ? null : parseInt(value);
    
    if (num !== null && (isNaN(num) || num < 1 || num > size)) return;

    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = num;
    setGrid(newGrid);
    
    // Also update initial grid to mark this as a "user set" value for styling
    // Unless we are already in solved state, in which case we are editing the result.
    // Let's simplified: Inputs are always editable unless we are currently solving.
    // We track "initial" only to style the "Question" vs "Answer".
    // When user types, it's part of the "Question".
    const newInitial = initialGrid.map(r => [...r]);
    newInitial[row][col] = num;
    setInitialGrid(newInitial);
    
    setError(null);
  };

  const handleSolve = async () => {
    // 1. Validate input
    if (!validateBoard(grid, size)) {
      setError("Invalid board configuration! Please check your numbers.");
      toast({
        title: "Invalid Board",
        description: "There are conflicting numbers on the grid.",
        variant: "destructive",
      });
      return;
    }

    setIsSolving(true);
    setError(null);

    // Deep copy for solving
    const boardToSolve = grid.map(row => [...row]);

    // Visualize? Yes, let's delay slightly to show animation if the board is small
    // For 9x9 it might be too slow to animate every step, so we'll do it fast or instant.
    // Let's do instant for responsiveness as requested, but maybe a tiny delay for effect?
    // User asked: "animate the filling of cells smoothly" when solution appears.
    // The backtracking viz is cool but slow. Let's just solve, then fill.
    
    // Actually, let's try a very fast visual solve
    try {
      // Find solution
      const solution = await solveSudoku(boardToSolve, size, 0); // 0ms delay for instant calculation

      if (solution) {
        // Animate the result filling in
        // We will update the grid state one by one or row by row to create a "filling" effect
        // Or just set it and let CSS animations handle the entry?
        // Let's set the grid to the solution, but identify which cells are "new" (solved)
        
        // Let's reveal row by row for effect
        const finalGrid = solution as Grid;
        
        // We need to keep the "initial" cells static, and animate the rest.
        // We can just set the grid and rely on the rendering logic to identify new cells.
        setGrid(finalGrid);
        setSolved(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#0ea5e9', '#ffffff']
        });
      } else {
        setError("No solution exists for this configuration.");
        toast({
            title: "Unsolvable",
            description: "No valid solution exists for the current numbers.",
            variant: "destructive",
        });
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred while solving.");
    } finally {
      setIsSolving(false);
    }
  };

  const handleClear = () => {
    const empty = createEmptyGrid(size);
    setGrid(empty);
    setInitialGrid(empty);
    setSolved(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-background font-sans">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 space-y-2"
      >
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight font-sans">
          Sudoku <span className="text-primary">Solver</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Select a grid size, enter your puzzle, and watch it solve.
        </p>
      </motion.div>

      {/* Mode Selection */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {[3, 9].map((s) => (
          <Button
            key={s}
            onClick={() => handleModeChange(s as GridSize)}
            variant={size === s ? "default" : "outline"}
            className={cn(
              "min-w-[100px] h-12 text-lg font-medium transition-all duration-300",
              size === s ? "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_var(--color-primary)]" : "hover:border-primary/50 text-muted-foreground"
            )}
          >
            {s} × {s}
          </Button>
        ))}
      </div>

      {/* Grid Container */}
      <motion.div 
        layout
        className="relative bg-card p-4 md:p-8 rounded-2xl shadow-2xl border border-white/5"
      >
        <div 
            className="grid gap-px bg-primary/20 border-2 border-primary/30 rounded-lg overflow-hidden"
            style={{ 
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                width: 'fit-content',
                margin: '0 auto'
            }}
        >
          {grid.map((row, rIndex) => (
            row.map((cell, cIndex) => {
              // Calculate borders for sub-grids
              const isThickRight = size === 9 ? (cIndex + 1) % 3 === 0 && cIndex !== 8 : false;
              const isThickBottom = size === 9 ? (rIndex + 1) % 3 === 0 && rIndex !== 8 : false;

              // Is this cell part of the original question or a solution?
              const isInitial = initialGrid[rIndex][cIndex] !== null;
              const isFilled = cell !== null;
              
              return (
                <motion.div
                  key={`${rIndex}-${cIndex}`}
                  initial={false}
                  animate={{ 
                    scale: isFilled ? 1 : 1,
                    backgroundColor: isFilled && !isInitial && solved ? "hsl(199 89% 48% / 0.15)" : "transparent"
                  }}
                  className={cn(
                    "relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-background",
                    isThickRight && "border-r-2 border-r-primary",
                    isThickBottom && "border-b-2 border-b-primary",
                    !isThickRight && cIndex !== size - 1 && "border-r border-r-white/10",
                    !isThickBottom && rIndex !== size - 1 && "border-b border-b-white/10"
                  )}
                >
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={cell ?? ""}
                        onChange={(e) => handleCellChange(rIndex, cIndex, e.target.value)}
                        disabled={isSolving}
                        className={cn(
                            "w-full h-full text-center bg-transparent border-none outline-none font-mono text-xl md:text-2xl transition-all duration-200",
                            "focus:bg-primary/10 focus:shadow-[inset_0_0_10px_rgba(56,189,248,0.2)]",
                            isInitial ? "text-white font-bold" : "text-primary animate-cell-fill",
                            // Add a subtle glow when focused
                            "focus:text-primary"
                        )}
                        onKeyDown={(e) => {
                            // Arrow key navigation could be implemented here
                            // For MVP, just standard tab works
                        }}
                    />
                </motion.div>
              );
            })
          ))}
        </div>

        {/* Status / Error Message */}
        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 justify-center"
                >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{error}</span>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
            <Button 
                size="lg"
                onClick={handleSolve}
                disabled={isSolving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg min-w-[140px] shadow-[0_0_20px_-5px_var(--color-primary)] hover:shadow-[0_0_30px_-5px_var(--color-primary)] transition-all duration-300"
            >
                {isSolving ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Solving...
                    </>
                ) : (
                    <>
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        Solve
                    </>
                )}
            </Button>

            <Button 
                size="lg"
                variant="outline"
                onClick={handleClear}
                disabled={isSolving}
                className="border-white/20 hover:bg-white/5 hover:text-white hover:border-white/40 text-muted-foreground"
            >
                <Eraser className="mr-2 h-5 w-5" />
                Clear
            </Button>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-12 text-muted-foreground text-sm">
        <p>Built with ❤️ using pure logic & React</p>
      </footer>
    </div>
  );
}
