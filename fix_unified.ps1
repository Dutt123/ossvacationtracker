$f = 'c:\Users\suniltanuku\Code\vacation_tracker\client\src\styles.css'
$c = [System.IO.File]::ReadAllText($f)

# ── Remove old lat-chart-section, lat-chart-wrap, lat-bar-row, lat-bar-name, lat-bar-track,
#    lat-bar-fill, lat-bar-seg, lat-bar-total, lat-bar-avatar, lat-bar-row-hovered blocks
#    and replace with unified system

$oldBlock = "/* ── Stacked horizontal bar chart ─────────────────────────────────────────── */

.lat-chart-section {
  padding: 12px 12px 12px;
}

.lat-chart-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.lat-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.18s ease;
}

.lat-bar-row:hover,
.lat-bar-row-hovered {
  background: rgba(0, 212, 255, 0.06);
}

.lat-bar-name {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  flex-shrink: 0;
  flex-grow: 0;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
}

.lat-bar-track {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.lat-bar-fill {
  display: flex;
  height: 18px;
  border-radius: 6px;
  overflow: hidden;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 2px;
}

.lat-bar-seg {
  height: 100%;
  transition: filter 0.15s ease, opacity 0.15s ease;
}

.lat-bar-seg:hover {
  filter: brightness(1.25);
}

.lat-bar-total {
  font-size: 11px;
  font-weight: var(--fw-heading);
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
}"

$newBlock = "/* ── Shared layout: name column + content area ────────────────────────────── */

:root {
  --lat-name-col: 190px;
}

/* Shared body wrapper used by all three views */
.lat-body {
  padding: 12px;
}

/* Shared name cell — identical in chart rows and table td */
.lat-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  width: var(--lat-name-col);
  min-width: var(--lat-name-col);
  max-width: var(--lat-name-col);
  flex-shrink: 0;
  flex-grow: 0;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  cursor: default;
}

.lat-name-cell-hovered {
  color: #00d4ff;
}

/* ── Stacked horizontal bar chart ─────────────────────────────────────────── */

.lat-chart-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lat-bar-row {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 4px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.18s ease;
}

.lat-bar-row:hover,
.lat-bar-row-hovered {
  background: rgba(0, 212, 255, 0.06);
}

.lat-bar-track {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-right: 4px;
}

.lat-bar-fill {
  display: flex;
  height: 18px;
  border-radius: 6px;
  overflow: hidden;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 2px;
  flex: 1;
  max-width: 100%;
}

.lat-bar-seg {
  height: 100%;
  transition: filter 0.15s ease;
}

.lat-bar-seg:hover {
  filter: brightness(1.25);
}

.lat-bar-total {
  font-size: 11px;
  font-weight: var(--fw-heading);
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
  width: 28px;
  text-align: right;
}"

$c = $c.Replace($oldBlock, $newBlock)

# ── Fix dash-th.name-col and dash-td.name-col to use the same variable
# Replace min-width: 160px on name-col th
$c = $c.Replace(
  ".dash-th.name-col {`r`n  text-align: left;`r`n  padding-left: 14px;`r`n  min-width: 160px;`r`n}",
  ".dash-th.name-col {`r`n  text-align: left;`r`n  padding: 10px 10px 10px 0;`r`n  width: var(--lat-name-col);`r`n  min-width: var(--lat-name-col);`r`n}"
)

# Remove dashboard-table-wrap padding since lat-body now owns it
$c = $c.Replace(
  ".dashboard-table-wrap {`r`n  overflow-x: auto;`r`n  padding: 12px;`r`n}",
  ".dashboard-table-wrap {`r`n  overflow-x: auto;`r`n  padding: 0;`r`n}"
)

# Fix dash-td.name-col to use variable and remove padding (NameCell is now inside td)
$i = $c.IndexOf(".dash-td.name-col {")
$end = $c.IndexOf("}", $i) + 1
$old_td_name = $c.Substring($i, $end - $i)
$new_td_name = ".dash-td.name-col {
  width: var(--lat-name-col);
  min-width: var(--lat-name-col);
  padding: 4px 0;
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(0, 212, 255, 0.15);
  border-radius: 8px;
}"
$c = $c.Replace($old_td_name, $new_td_name)

[System.IO.File]::WriteAllText($f, $c)
Write-Host "lat-name-col var:" $c.Contains("--lat-name-col")
Write-Host "lat-body:" $c.Contains(".lat-body {")
Write-Host "lat-name-cell:" $c.Contains(".lat-name-cell {")
Write-Host "lat-bar-fill flex:1:" $c.Contains("flex: 1;")
