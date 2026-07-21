import { useState, useRef } from "react"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { api, type ColumnMapping } from "../api"

function parseCSV(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim())
  return lines.map((line) => {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  })
}

interface Props {
  onClose: () => void
  onImported: () => void
}

type ImportMode = "csv" | "pdf" | "bank-pdf"

export default function ImportCSVDialog({ onClose, onImported }: Props) {
  const [mode, setMode] = useState<ImportMode>("csv")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][] | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    date_column: "",
    description_column: "",
    amount_column: "",
    debit_column: "",
    credit_column: "",
    balance_column: "",
    date_format: "dayfirst",
  })
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useSplit, setUseSplit] = useState(false)
  const [pdfParsing, setPdfParsing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setError(null)
    setPreview(null)
    setColumns([])

    if (mode === "csv") {
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        const rows = parseCSV(text)
        if (rows.length < 2) {
          setError("CSV file appears empty or invalid")
          return
        }
        const cols = rows[0]
        setColumns(cols)
        setPreview(rows.slice(1, 6))

        const auto: ColumnMapping = {
          date_column: "",
          description_column: "",
          amount_column: "",
          debit_column: "",
          credit_column: "",
          balance_column: "",
          date_format: "dayfirst",
        }
        const lower = cols.map((c) => c.toLowerCase())
        const dateIdx = lower.findIndex(
          (c) => c.includes("date") || c.includes("dt") || c === "transaction date"
        )
        const descIdx = lower.findIndex((c) => c.includes("desc") || c.includes("remark") || c.includes("narrative") || c.includes("particular"))
        const amtIdx = lower.findIndex((c) => c === "amount" || c.includes("amount") && !c.includes("withdrawal") && !c.includes("deposit"))
        const debitIdx = lower.findIndex((c) => c.includes("withdrawal") || c.includes("debit") || c.includes("dr") || c.includes("withdrawn"))
        const creditIdx = lower.findIndex((c) => c.includes("deposit") || c.includes("credit") || c.includes("cr"))
        const balIdx = lower.findIndex((c) => c.includes("balance") || c === "bal")

        if (dateIdx >= 0) auto.date_column = cols[dateIdx]
        if (descIdx >= 0) auto.description_column = cols[descIdx]
        if (amtIdx >= 0) auto.amount_column = cols[amtIdx]
        if (debitIdx >= 0) auto.debit_column = cols[debitIdx]
        if (creditIdx >= 0) auto.credit_column = cols[creditIdx]
        if (balIdx >= 0) auto.balance_column = cols[balIdx]

        if (auto.debit_column || auto.credit_column) {
          setUseSplit(true)
          auto.amount_column = ""
        }

        setMapping(auto)
      }
      reader.readAsText(f)
    } else if (mode === "pdf") {
      setPdfParsing(true)
      try {
        const result = await api.importPDFPreview(f)
        if (result.columns.length === 0) {
          setError("Could not extract any table from this PDF. Ensure it is a GPay statement PDF.")
          return
        }
        setColumns(result.columns)
        setPreview(result.rows)

        const auto: ColumnMapping = {
          date_column: "",
          description_column: "",
          amount_column: "",
          debit_column: "",
          credit_column: "",
          balance_column: "",
          date_format: "dayfirst",
        }
        const lower = result.columns.map((c) => c.toLowerCase())
        const dateIdx = lower.findIndex(
          (c) => c.includes("date") || c.includes("dt") || c === "transaction date"
        )
        const descIdx = lower.findIndex((c) => c.includes("desc") || c.includes("remark") || c.includes("narrative") || c.includes("particular") || c.includes("details") || c.includes("transaction"))
        const amtIdx = lower.findIndex((c) => c === "amount" || c.includes("amount") && !c.includes("withdrawal") && !c.includes("deposit"))
        const debitIdx = lower.findIndex((c) => c.includes("withdrawal") || c.includes("debit") || c.includes("dr") || c.includes("withdrawn"))
        const creditIdx = lower.findIndex((c) => c.includes("deposit") || c.includes("credit") || c.includes("cr"))
        const balIdx = lower.findIndex((c) => c.includes("balance") || c === "bal")

        if (dateIdx >= 0) auto.date_column = result.columns[dateIdx]
        if (descIdx >= 0) auto.description_column = result.columns[descIdx]
        if (amtIdx >= 0) auto.amount_column = result.columns[amtIdx]
        if (debitIdx >= 0) auto.debit_column = result.columns[debitIdx]
        if (creditIdx >= 0) auto.credit_column = result.columns[creditIdx]
        if (balIdx >= 0) auto.balance_column = result.columns[balIdx]

        if (auto.debit_column || auto.credit_column) {
          setUseSplit(true)
          auto.amount_column = ""
        }

        setMapping(auto)
      } catch {
        setError("Failed to parse PDF. Ensure it is a valid GPay statement PDF.")
      } finally {
        setPdfParsing(false)
      }
    } else {
      // bank-pdf mode
      setPdfParsing(true)
      try {
        const result = await api.importBankPDFPreview(f)
        if (result.columns.length === 0) {
          setError("Could not extract any transactions from this PDF. Try a different bank statement.")
          return
        }
        setColumns(result.columns)
        setPreview(result.rows)

        // Bank PDF extractor returns: Date, Description, Ref No, Debit, Credit, Balance
        // No manual mapping needed — auto-configure
        setMapping({
          date_column: "Date",
          description_column: "Description",
          amount_column: "",
          debit_column: "Debit",
          credit_column: "Credit",
          balance_column: "Balance",
          date_format: "dayfirst",
        })
        setUseSplit(true)
      } catch {
        setError("Failed to parse bank PDF. The format may not be supported yet.")
      } finally {
        setPdfParsing(false)
      }
    }
  }

  function set(col: keyof ColumnMapping, value: string) {
    setMapping((m) => ({ ...m, [col]: value }))
  }

  function setAmountMode(split: boolean) {
    setUseSplit(split)
    if (split) {
      setMapping((m) => ({ ...m, amount_column: "" }))
    } else {
      setMapping((m) => ({ ...m, debit_column: "", credit_column: "" }))
    }
  }

  function switchMode(m: ImportMode) {
    setMode(m)
    setFile(null)
    setPreview(null)
    setColumns([])
    setError(null)
    setMapping({
      date_column: "",
      description_column: "",
      amount_column: "",
      debit_column: "",
      credit_column: "",
      balance_column: "",
      date_format: "dayfirst",
    })
    setUseSplit(false)
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setError(null)
    try {
      let result: { imported: number }
      if (mode === "bank-pdf") {
        result = await api.importBankPDF(file)
      } else {
        const clean: Record<string, string> = {}
        for (const [k, v] of Object.entries(mapping)) {
          if (v) clean[k] = v
        }
        const fn = mode === "csv" ? api.importCSV : api.importPDF
        result = await fn(file, clean as unknown as ColumnMapping)
      }
      onImported()
      alert(`Imported ${result.imported} transactions`)
      onClose()
    } catch {
      setError("Import failed. Check that column mappings are correct.")
    } finally {
      setImporting(false)
    }
  }

  function isReady(): boolean {
    if (!file) return false
    if (mode === "bank-pdf") return true
    if (!mapping.date_column || !mapping.description_column) return false
    if (useSplit) {
      return !!mapping.debit_column || !!mapping.credit_column
    }
    return !!mapping.amount_column
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative w-full max-w-3xl max-h-full overflow-y-auto z-10">
        <CardHeader>
          <CardTitle>Import Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive-light border border-destructive/30 text-destructive px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Source:</span>
            <button
              type="button"
              onClick={() => switchMode("csv")}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                mode === "csv" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => switchMode("pdf")}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                mode === "pdf" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}
            >
              PDF (GPay)
            </button>
            <button
              type="button"
              onClick={() => switchMode("bank-pdf")}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                mode === "bank-pdf" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}
            >
              PDF (Bank)
            </button>
          </div>

          <div>
            <input
              type="file"
              accept={mode === "csv" ? ".csv" : ".pdf"}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
              className="hidden"
              ref={fileRef}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              {file ? "Change File" : `Select ${mode === "csv" ? "CSV" : "PDF"} File`}
            </Button>
            {file && <span className="ml-3 text-sm text-muted-foreground">{file.name}</span>}
          </div>

          {pdfParsing && (
            <div className="text-sm text-muted-foreground">Parsing PDF, please wait...</div>
          )}

          {preview && columns.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Preview (first {preview.length} rows)</h4>
                <div className="overflow-x-auto border border-border rounded-lg text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        {columns.map((c, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, ri) => (
                        <tr key={ri} className="border-t border-border">
                          {columns.map((_, ci) => (
                            <td key={ci} className="px-3 py-2 text-foreground whitespace-nowrap">
                              {row[ci] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mode === "bank-pdf" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Transactions are auto-extracted and categorized. No manual mapping needed.
                  </p>
                )}
              </div>

              {mode !== "bank-pdf" && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Column Mapping</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldSelect label="Date" cols={columns} value={mapping.date_column} onChange={(v) => set("date_column", v)} required />
                  <FieldSelect label="Description" cols={columns} value={mapping.description_column} onChange={(v) => set("description_column", v)} required />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Amount mode:</span>
                  <button
                    type="button"
                    onClick={() => setAmountMode(false)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      !useSplit ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    Single column
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountMode(true)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      useSplit ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    Split Debit / Credit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {useSplit ? (
                    <>
                      <FieldSelect label="Debit / Withdrawal" cols={columns} value={mapping.debit_column ?? ""} onChange={(v) => set("debit_column", v)} />
                      <FieldSelect label="Credit / Deposit" cols={columns} value={mapping.credit_column ?? ""} onChange={(v) => set("credit_column", v)} />
                    </>
                  ) : (
                    <FieldSelect label="Amount" cols={columns} value={mapping.amount_column ?? ""} onChange={(v) => set("amount_column", v)} required />
                  )}
                  <FieldSelect label="Balance (optional)" cols={columns} value={mapping.balance_column ?? ""} onChange={(v) => set("balance_column", v)} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date Format</label>
                  <select
                    value={mapping.date_format}
                    onChange={(e) => set("date_format", e.target.value as "dayfirst" | "monthfirst")}
                    className="w-full max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="dayfirst">Day first (DD/MM/YYYY)</option>
                    <option value="monthfirst">Month first (MM/DD/YYYY)</option>
                  </select>
                </div>
              </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleImport} disabled={!isReady() || importing || pdfParsing}>
              {importing ? "Importing..." : pdfParsing ? "Parsing..." : file ? "Import" : "Select a file first"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FieldSelect({
  label,
  cols,
  value,
  onChange,
  required,
}: {
  label: string
  cols: string[]
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">—</option>
        {cols.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  )
}
