import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { RecordRow } from "./export";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#7a6145", marginBottom: 20 },
  table: { width: "100%" },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#c17c2e",
    borderRadius: 3,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e3d4bc",
    paddingVertical: 5,
  },
  rowAlt: { backgroundColor: "#faf7f2" },
  headerCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8,
  },
  cell: { paddingHorizontal: 6, color: "#1c1309" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#7a6145", flexDirection: "row", justifyContent: "space-between" },
});

interface PDFReportProps {
  title: string;
  subtitle: string;
  columns: string[];
  rows: RecordRow[];
  colKeys: string[];
}

function PDFReport({ title, subtitle, columns, rows, colKeys }: PDFReportProps) {
  const colWidth = `${(100 / columns.length).toFixed(1)}%`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <Text key={col} style={[styles.headerCell, { width: colWidth }]}>
                {col}
              </Text>
            ))}
          </View>

          {rows.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.cell, { width: "100%", color: "#7a6145" }]}>
                No records found for this period.
              </Text>
            </View>
          ) : (
            rows.map((row, i) => (
              <View key={i} style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}>
                {colKeys.map((key) => (
                  <Text key={key} style={[styles.cell, { width: colWidth }]}>
                    {String(row[key] ?? "")}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text>317 Booking</Text>
          <Text>Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderPDF(props: PDFReportProps): Promise<Uint8Array> {
  const buf = await (renderToBuffer(React.createElement(PDFReport, props)) as Promise<Buffer>);
  return new Uint8Array(buf);
}
