import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Calculator,
  RefreshCw,
  HelpCircle,
  Users,
  ShieldCheck,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import {
  EntityConfig,
  PartnerCapitalRecord,
  NoteScheduleData,
  ProfitAndLossData,
} from '../types';
import {
  parsePartnerLedgerOrScheduleFile,
  downloadPartnerCapitalTemplate,
  PartnerParseResult,
} from '../utils/fileParsers';
import { formatINR } from '../utils/financialCalculations';

interface PartnerCapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EntityConfig;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  noteSchedule?: NoteScheduleData;
  profitAndLoss?: Omit<ProfitAndLossData, 'previousYear'>;
  initialPeriod?: 'CY' | 'PY';
}

export const PartnerCapitalModal: React.FC<PartnerCapitalModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  noteSchedule,
  profitAndLoss,
  initialPeriod = 'CY',
}) => {
  const isProprietor = config.entityType === 'Sole Proprietorship';
  const [activeTab, setActiveTab] = useState<'schedule' | 'upload' | 'ledger_mapping'>('schedule');
  const [period, setPeriod] = useState<'CY' | 'PY'>(initialPeriod);

  // Active editable rows for CY and PY
  const [cyRows, setCyRows] = useState<PartnerCapitalRecord[]>([]);
  const [pyRows, setPyRows] = useState<PartnerCapitalRecord[]>([]);

  // File upload state
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<PartnerParseResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ledger mapping state
  const [ledgerMappings, setLedgerMappings] = useState<
    Record<string, { partnerName: string; field: keyof PartnerCapitalRecord }>
  >({});

  // Status / Feedback message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Initialize data on modal open or period change
  useEffect(() => {
    if (!isOpen) return;

    // Initialize CY rows
    if (config.partnerCapitalSchedule && config.partnerCapitalSchedule.length > 0) {
      setCyRows(config.partnerCapitalSchedule.map((r, i) => ({ ...r, srNo: i + 1 })));
    } else if (noteSchedule?.partnerCapitalTable && noteSchedule.partnerCapitalTable.length > 0) {
      setCyRows(noteSchedule.partnerCapitalTable.map((r, i) => ({ ...r, srNo: i + 1 })));
    } else if (config.partners && config.partners.length > 0) {
      setCyRows(
        config.partners.map((p, i) => {
          const psr = p.profitSharePercent || Math.round(100 / config.partners!.length);
          const rsr = p.remunerationSharePercent !== undefined ? p.remunerationSharePercent : psr;
          return {
            srNo: i + 1,
            partnerName: p.name,
            profitSharePercent: psr,
            profitShareRatio: `${psr}%`,
            remunerationSharePercent: rsr,
            remunerationShareRatio: `${rsr}%`,
            isWorkingPartner: p.isWorkingPartner ?? true,
            isDesignatedPartner: p.isDesignatedPartner ?? true,
            openingBalance: p.openingBalance || 0,
            capitalIntroduced: p.capitalIntroduced || 0,
            remuneration: p.remuneration || 0,
            interestOnCapital: p.interestOnCapital || 0,
            withdrawals: p.withdrawals || 0,
            shareOfProfit: p.shareOfProfit || 0,
            closingBalance:
              p.closingBalance ||
              Math.round(
                ((p.openingBalance || 0) +
                  (p.capitalIntroduced || 0) +
                  (p.remuneration || 0) +
                  (p.interestOnCapital || 0) -
                  (p.withdrawals || 0) +
                  (p.shareOfProfit || 0)) *
                  100
              ) / 100,
          };
        })
      );
    } else if (isProprietor) {
      // Default 1 proprietor
      setCyRows([
        {
          srNo: 1,
          partnerName: config.entityName || 'Proprietor',
          profitSharePercent: 100,
          profitShareRatio: '100%',
          remunerationSharePercent: 0,
          remunerationShareRatio: '-',
          isWorkingPartner: true,
          isDesignatedPartner: false,
          openingBalance: 0,
          capitalIntroduced: 0,
          remuneration: 0,
          interestOnCapital: 0,
          withdrawals: 0,
          shareOfProfit: 0,
          closingBalance: 0,
        },
      ]);
    } else {
      // Default 2 partners
      setCyRows([
        {
          srNo: 1,
          partnerName: 'Partner 1',
          profitSharePercent: 50,
          profitShareRatio: '50%',
          remunerationSharePercent: 50,
          remunerationShareRatio: '50%',
          isWorkingPartner: true,
          isDesignatedPartner: true,
          openingBalance: 0,
          capitalIntroduced: 0,
          remuneration: 0,
          interestOnCapital: 0,
          withdrawals: 0,
          shareOfProfit: 0,
          closingBalance: 0,
        },
        {
          srNo: 2,
          partnerName: 'Partner 2',
          profitSharePercent: 50,
          profitShareRatio: '50%',
          remunerationSharePercent: 50,
          remunerationShareRatio: '50%',
          isWorkingPartner: true,
          isDesignatedPartner: true,
          openingBalance: 0,
          capitalIntroduced: 0,
          remuneration: 0,
          interestOnCapital: 0,
          withdrawals: 0,
          shareOfProfit: 0,
          closingBalance: 0,
        },
      ]);
    }

    // Initialize PY rows
    if (config.pyPartnerCapitalSchedule && config.pyPartnerCapitalSchedule.length > 0) {
      setPyRows(config.pyPartnerCapitalSchedule.map((r, i) => ({ ...r, srNo: i + 1 })));
    } else if (noteSchedule?.pyPartnerCapitalTable && noteSchedule.pyPartnerCapitalTable.length > 0) {
      setPyRows(noteSchedule.pyPartnerCapitalTable.map((r, i) => ({ ...r, srNo: i + 1 })));
    } else {
      setPyRows([]);
    }

    setStatusMsg(null);
    setParseResult(null);
    setUploadedFileName('');
  }, [isOpen, config, noteSchedule]);

  // Current active rows based on period
  const activeRows = period === 'CY' ? cyRows : pyRows;
  const setActiveRows = period === 'CY' ? setCyRows : setPyRows;

  // Target Total from Note 3
  const targetNote3Total =
    period === 'CY' ? (noteSchedule?.totalAmount || 0) : (noteSchedule?.previousYearAmount || 0);

  // Computations on active schedule
  const totalScheduleClosing = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.closingBalance || 0), 0),
    [activeRows]
  );
  const totalOpening = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.openingBalance || 0), 0),
    [activeRows]
  );
  const totalIntroduced = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.capitalIntroduced || 0), 0),
    [activeRows]
  );
  const totalRemun = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.remuneration || 0), 0),
    [activeRows]
  );
  const totalInterest = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.interestOnCapital || 0), 0),
    [activeRows]
  );
  const totalWithdrawals = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.withdrawals || 0), 0),
    [activeRows]
  );
  const totalProfitShare = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.shareOfProfit || 0), 0),
    [activeRows]
  );
  const totalPsr = useMemo(
    () => activeRows.reduce((sum, r) => sum + (r.profitSharePercent || 0), 0),
    [activeRows]
  );
  const totalRsr = useMemo(
    () =>
      activeRows.reduce(
        (sum, r) =>
          sum +
          (r.remunerationSharePercent !== undefined
            ? r.remunerationSharePercent
            : r.profitSharePercent || 0),
        0
      ),
    [activeRows]
  );

  const variance = Math.round((targetNote3Total - totalScheduleClosing) * 100) / 100;
  const isReconciled = Math.abs(variance) < 0.05;

  // Partner names list
  const partnerNames = useMemo(
    () => activeRows.map((r) => r.partnerName.trim()).filter(Boolean),
    [activeRows]
  );

  // Handle cell edit in schedule
  const handleCellChange = (
    index: number,
    field: keyof PartnerCapitalRecord | 'openingNature',
    value: string | number,
    natureOverride?: 'Cr' | 'Dr'
  ) => {
    setActiveRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (field === 'partnerName') {
        row.partnerName = String(value);
      } else if (field === 'profitSharePercent') {
        const num = parseFloat(String(value)) || 0;
        row.profitSharePercent = num;
        row.profitShareRatio = `${num}%`;
      } else if (field === 'remunerationSharePercent') {
        const num = parseFloat(String(value)) || 0;
        row.remunerationSharePercent = num;
        row.remunerationShareRatio = `${num}%`;
      } else if (field === 'openingNature') {
        const newNature = (value as 'Cr' | 'Dr') || 'Cr';
        row.openingNature = newNature;
        const currentAbs = Math.abs(row.openingBalance || 0);
        row.openingBalance = newNature === 'Dr' ? -currentAbs : currentAbs;

        // Recalculate closing balance
        const open = row.openingBalance;
        const intro = row.capitalIntroduced || 0;
        const rem = row.remuneration || 0;
        const intVal = row.interestOnCapital || 0;
        const draw = row.withdrawals || 0;
        const prof = row.shareOfProfit || 0;
        row.closingBalance =
          Math.round((open + intro + rem + intVal - draw + prof) * 100) / 100;
      } else {
        const num = parseFloat(String(value)) || 0;
        (row as any)[field] = num;

        if (field === 'openingBalance' && natureOverride) {
          row.openingNature = natureOverride;
        }

        // Auto-calculate closing balance if one of the components was changed
        if (field !== 'closingBalance') {
          const open = field === 'openingBalance' ? num : (row.openingBalance || 0);
          const intro = field === 'capitalIntroduced' ? num : (row.capitalIntroduced || 0);
          const rem = field === 'remuneration' ? num : (row.remuneration || 0);
          const intVal = field === 'interestOnCapital' ? num : (row.interestOnCapital || 0);
          const draw = field === 'withdrawals' ? num : (row.withdrawals || 0);
          const prof = field === 'shareOfProfit' ? num : (row.shareOfProfit || 0);

          row.closingBalance =
            Math.round((open + intro + rem + intVal - draw + prof) * 100) / 100;
        }
      }

      updated[index] = row;
      return updated;
    });
  };

  // Add Partner row
  const handleAddPartner = () => {
    const newIdx = activeRows.length + 1;
    const remainingPsr = Math.max(0, Math.round((100 - totalPsr) * 100) / 100);
    const remainingRsr = Math.max(0, Math.round((100 - totalRsr) * 100) / 100);
    setActiveRows((prev) => [
      ...prev,
      {
        srNo: newIdx,
        partnerName: `Partner ${newIdx}`,
        profitSharePercent: remainingPsr,
        profitShareRatio: `${remainingPsr}%`,
        remunerationSharePercent: remainingRsr > 0 ? remainingRsr : remainingPsr,
        remunerationShareRatio: `${remainingRsr > 0 ? remainingRsr : remainingPsr}%`,
        isWorkingPartner: true,
        isDesignatedPartner: true,
        openingBalance: 0,
        capitalIntroduced: 0,
        remuneration: 0,
        interestOnCapital: 0,
        withdrawals: 0,
        shareOfProfit: 0,
        closingBalance: 0,
      },
    ]);
  };

  // Remove Partner row
  const handleRemovePartner = (index: number) => {
    if (activeRows.length <= 1) {
      setStatusMsg({ type: 'error', text: 'At least one partner/owner record is required.' });
      return;
    }
    setActiveRows((prev) =>
      prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, srNo: i + 1 }))
    );
  };

  // 1-Click: Distribute Net Profit (PAT) by PSR %
  const handleDistributePAT = () => {
    const pat = profitAndLoss?.profitAfterTax || 0;
    if (pat === 0) {
      setStatusMsg({
        type: 'info',
        text: 'Net Profit after Tax (PAT) is ₹0.00. No distribution needed.',
      });
      return;
    }

    setActiveRows((prev) => {
      const count = prev.length;
      let allocatedTotal = 0;

      return prev.map((row, idx) => {
        const ratio = (row.profitSharePercent || (100 / count)) / 100;
        const share =
          idx === count - 1
            ? Math.round((pat - allocatedTotal) * 100) / 100
            : Math.round(pat * ratio * 100) / 100;
        allocatedTotal += share;

        const newClosing =
          Math.round(
            ((row.openingBalance || 0) +
              (row.capitalIntroduced || 0) +
              (row.remuneration || 0) +
              (row.interestOnCapital || 0) -
              (row.withdrawals || 0) +
              share) *
              100
          ) / 100;

        return {
          ...row,
          shareOfProfit: share,
          closingBalance: newClosing,
        };
      });
    });

    setStatusMsg({
      type: 'success',
      text: `Allocated Net Profit after Tax (₹${formatINR(pat)}) to ${activeRows.length} partners based on Profit Sharing Ratio.`,
    });
  };

  // 1-Click: Distribute Partners' Remuneration by RSR %
  const handleDistributeRemuneration = () => {
    const remun = profitAndLoss?.partnersRemuneration || 0;
    if (remun === 0) {
      setStatusMsg({
        type: 'info',
        text: "Line X Partners' remuneration is ₹0.00. No amount to distribute.",
      });
      return;
    }

    setActiveRows((prev) => {
      const count = prev.length;
      let allocated = 0;

      return prev.map((row, idx) => {
        const ratio = (row.remunerationSharePercent !== undefined ? row.remunerationSharePercent : (row.profitSharePercent || (100 / count))) / 100;
        const share =
          idx === count - 1
            ? Math.round((remun - allocated) * 100) / 100
            : Math.round(remun * ratio * 100) / 100;
        allocated += share;

        const newClosing =
          Math.round(
            ((row.openingBalance || 0) +
              (row.capitalIntroduced || 0) +
              share +
              (row.interestOnCapital || 0) -
              (row.withdrawals || 0) +
              (row.shareOfProfit || 0)) *
              100
          ) / 100;

        return {
          ...row,
          remuneration: share,
          closingBalance: newClosing,
        };
      });
    });

    setStatusMsg({
      type: 'success',
      text: `Distributed Line X Remuneration (₹${formatINR(remun)}) across partners based on Remuneration Sharing Ratio (RSR).`,
    });
  };

  // 1-Click: Sync from Note 3 Trial Balance Ledgers
  const handleSyncFromNote3Ledgers = () => {
    if (!noteSchedule?.items || noteSchedule.items.length === 0) {
      setStatusMsg({
        type: 'error',
        text: 'No ledger accounts found mapped under Note 3 in the Trial Balance.',
      });
      return;
    }

    interface DiscoveredItem {
      name: string;
      capitalBal: number;
      drawingsBal: number;
      introBal: number;
    }
    const map = new Map<string, DiscoveredItem>();

    noteSchedule.items.forEach((it) => {
      const rawName = it.accountName;
      if (
        it.accountCode?.startsWith('VIRT-') ||
        rawName.toLowerCase().includes('total') ||
        rawName.toLowerCase().includes('net profit') ||
        rawName.toLowerCase().includes('statutory')
      ) {
        return;
      }

      const cleaned = rawName
        .replace(/(capital\s*a\/c|capital\s*account|current\s*a\/c|current\s*account|drawings\s*a\/c|drawings|partner)/gi, '')
        .replace(/[-–:_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleaned.length < 2) return;

      if (!map.has(cleaned)) {
        map.set(cleaned, { name: cleaned, capitalBal: 0, drawingsBal: 0, introBal: 0 });
      }

      const partner = map.get(cleaned)!;
      const isDebit = ((it.originalDebit || 0) > (it.originalCredit || 0)) || it.accountName.toLowerCase().includes('drawing');
      const bal = Math.abs(it.displayBalance !== undefined ? it.displayBalance : it.netBalance);

      if (isDebit) {
        partner.drawingsBal += bal;
      } else if (it.subCategory?.toLowerCase().includes('introduced') || it.accountName.toLowerCase().includes('introduced')) {
        partner.introBal += bal;
      } else {
        partner.capitalBal += bal;
      }
    });

    const discovered = Array.from(map.values());
    if (discovered.length === 0) {
      setStatusMsg({
        type: 'info',
        text: 'Could not auto-extract partner names from Note 3 ledger titles. You can manually enter or upload them.',
      });
      return;
    }

    const count = discovered.length;
    const equalPsr = Math.round((100 / count) * 100) / 100;
    const pat = profitAndLoss?.profitAfterTax || 0;
    const remun = profitAndLoss?.partnersRemuneration || 0;

    const newRows: PartnerCapitalRecord[] = discovered.map((dp, idx) => {
      const psr = idx === count - 1 ? Math.round((100 - equalPsr * (count - 1)) * 100) / 100 : equalPsr;
      const ratio = psr / 100;
      const pRemun = Math.round(remun * ratio * 100) / 100;
      const pProfit = Math.round(pat * ratio * 100) / 100;
      const pClosing = Math.round(dp.capitalBal * 100) / 100;
      const pOpening = Math.round((pClosing - dp.introBal - pRemun + dp.drawingsBal - pProfit) * 100) / 100;

      const effectiveOpening = pOpening;
      return {
        srNo: idx + 1,
        partnerName: dp.name,
        profitSharePercent: psr,
        profitShareRatio: `${psr}%`,
        openingBalance: effectiveOpening,
        openingNature: effectiveOpening < 0 ? 'Dr' : 'Cr',
        capitalIntroduced: dp.introBal,
        remuneration: pRemun,
        interestOnCapital: 0,
        withdrawals: dp.drawingsBal,
        shareOfProfit: pProfit,
        closingBalance: pClosing,
      };
    });

    setActiveRows(newRows);
    setStatusMsg({
      type: 'success',
      text: `Successfully synced ${newRows.length} partner capital accounts directly from Trial Balance ledgers!`,
    });
  };

  // 1-Click: Reconcile Balance Difference
  const handleAutoReconcileVariance = () => {
    if (activeRows.length === 0) return;
    if (Math.abs(variance) === 0) {
      setStatusMsg({ type: 'info', text: 'Schedule is already perfectly reconciled with Note 3.' });
      return;
    }

    setActiveRows((prev) => {
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.closingBalance = Math.round((last.closingBalance + variance) * 100) / 100;
      last.openingBalance = Math.round((last.openingBalance + variance) * 100) / 100;
      last.openingNature = last.openingBalance < 0 ? 'Dr' : 'Cr';
      updated[updated.length - 1] = last;
      return updated;
    });

    setStatusMsg({
      type: 'success',
      text: `Reconciled variance of ₹${formatINR(Math.abs(variance))} into opening and closing balance of ${activeRows[activeRows.length - 1].partnerName}.`,
    });
  };

  // File Upload Handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploadedFileName(file.name);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = parsePartnerLedgerOrScheduleFile(buffer, file.name);
        setParseResult(result);

        if (result.partners.length > 0) {
          setStatusMsg({
            type: 'success',
            text: `Detected ${result.partners.length} partner record(s) from "${file.name}" in ${result.format.toUpperCase()} format. Review preview below and click "Apply".`,
          });
        } else {
          setStatusMsg({
            type: 'error',
            text: result.warnings[0] || 'No partner records could be parsed. Check column headings.',
          });
        }
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: `Failed to parse file: ${err.message || String(err)}`,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Apply parsed file to schedule
  const handleApplyUploadedData = () => {
    if (!parseResult || parseResult.partners.length === 0) return;
    setActiveRows(parseResult.partners.map((r, i) => ({ ...r, srNo: i + 1 })));
    setActiveTab('schedule');
    setStatusMsg({
      type: 'success',
      text: `Applied ${parseResult.partners.length} partner records into Note 3 statutory schedule.`,
    });
  };

  // Trial Balance Ledger Mapping Handlers
  const handleAssignLedger = (
    ledgerId: string,
    partnerName: string,
    field: keyof PartnerCapitalRecord
  ) => {
    setLedgerMappings((prev) => ({
      ...prev,
      [ledgerId]: { partnerName, field },
    }));
  };

  const handleApplyLedgerMappings = () => {
    const items = noteSchedule?.items || [];
    if (items.length === 0) {
      setStatusMsg({ type: 'info', text: 'No Note 3 ledgers available to map.' });
      return;
    }

    const partnerAccum: Record<string, Partial<PartnerCapitalRecord>> = {};

    items.forEach((item) => {
      const mapping = ledgerMappings[item.id || item.accountName];
      if (!mapping || !mapping.partnerName) return;

      const pName = mapping.partnerName;
      if (!partnerAccum[pName]) {
        partnerAccum[pName] = {
          partnerName: pName,
          openingBalance: 0,
          capitalIntroduced: 0,
          remuneration: 0,
          interestOnCapital: 0,
          withdrawals: 0,
          shareOfProfit: 0,
          closingBalance: 0,
        };
      }

      const bal = Math.abs(item.displayBalance !== undefined ? item.displayBalance : item.netBalance);
      const f = mapping.field;

      if (f !== 'partnerName' && f !== 'srNo' && f !== 'profitShareRatio') {
        (partnerAccum[pName] as any)[f] = ((partnerAccum[pName] as any)[f] || 0) + bal;
      }
    });

    const entries = Object.values(partnerAccum);
    if (entries.length === 0) {
      setStatusMsg({
        type: 'info',
        text: 'Please select at least one partner and field assignment for your ledgers.',
      });
      return;
    }

    const count = entries.length;
    const eqPsr = Math.round((100 / count) * 100) / 100;

    const newRows: PartnerCapitalRecord[] = entries.map((p, idx) => {
      const psr = idx === count - 1 ? Math.round((100 - eqPsr * (count - 1)) * 100) / 100 : eqPsr;
      const open = p.openingBalance || 0;
      const intro = p.capitalIntroduced || 0;
      const rem = p.remuneration || 0;
      const intVal = p.interestOnCapital || 0;
      const draw = p.withdrawals || 0;
      const prof = p.shareOfProfit || 0;
      const close = p.closingBalance || Math.round((open + intro + rem + intVal - draw + prof) * 100) / 100;

      return {
        srNo: idx + 1,
        partnerName: p.partnerName || `Partner ${idx + 1}`,
        profitSharePercent: psr,
        profitShareRatio: `${psr}%`,
        openingBalance: open,
        capitalIntroduced: intro,
        remuneration: rem,
        interestOnCapital: intVal,
        withdrawals: draw,
        shareOfProfit: prof,
        closingBalance: close,
      };
    });

    setActiveRows(newRows);
    setActiveTab('schedule');
    setStatusMsg({
      type: 'success',
      text: `Successfully aggregated ${items.length} ledgers into ${newRows.length} partner capital schedule records!`,
    });
  };

  // Final Save & Commit
  const handleSaveAndApply = () => {
    // Basic validation
    if (activeRows.length === 0) {
      setStatusMsg({ type: 'error', text: 'Please add at least one partner record.' });
      return;
    }

    const updatedConfig: Partial<EntityConfig> = {
      partnerCapitalSchedule: cyRows.map((r, i) => ({ ...r, srNo: i + 1 })),
      pyPartnerCapitalSchedule: pyRows.map((r, i) => ({ ...r, srNo: i + 1 })),
      // Also update config.partners array for synchronization
      partners: cyRows.map((r) => ({
        name: r.partnerName,
        profitSharePercent: r.profitSharePercent,
        remunerationSharePercent: r.remunerationSharePercent,
        remunerationShareRatio: r.remunerationShareRatio,
        isWorkingPartner: r.isWorkingPartner,
        isDesignatedPartner: r.isDesignatedPartner,
        openingBalance: r.openingBalance,
        openingNature: r.openingNature || (r.openingBalance < 0 ? 'Dr' : 'Cr'),
        capitalIntroduced: r.capitalIntroduced,
        remuneration: r.remuneration,
        interestOnCapital: r.interestOnCapital,
        withdrawals: r.withdrawals,
        shareOfProfit: r.shareOfProfit,
        closingBalance: r.closingBalance,
      })),
    };

    onUpdateConfig(updatedConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>
                  {isProprietor
                    ? "Proprietor's Capital Account Statutory Schedule (Page 6)"
                    : config.entityType === 'LLP'
                    ? "Partners' / Designated Partners' Capital Account Statutory Schedule (Page 6)"
                    : "Owners' / Partners' Capital Account Statutory Schedule (Page 6)"}
                </span>
                <span className="text-[10px] bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  Note 3
                </span>
              </h3>
              <p className="text-xs text-emerald-100/70">
                {isProprietor
                  ? "Upload proprietor ledger, map trial balance accounts, or fine-tune proprietor's capital movements."
                  : "Upload partner ledgers, map trial balance accounts, or fine-tune individual capital movements and PSR%."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period & Tabs Navigation Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'schedule'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isProprietor ? "8-Column Schedule Grid" : "10-Column Schedule Grid"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isProprietor ? "Upload Proprietor Statement / Ledger" : "Upload Partner Ledgers / Statement"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger_mapping')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'ledger_mapping'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Map Trial Balance Ledgers</span>
            </button>
          </div>

          {/* Period Toggle & Template Download */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPeriod('CY')}
                className={`px-2.5 py-1 rounded-md transition ${
                  period === 'CY'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Current Year (CY)
              </button>
              <button
                type="button"
                onClick={() => setPeriod('PY')}
                className={`px-2.5 py-1 rounded-md transition ${
                  period === 'PY'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Previous Year (PY)
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                downloadPartnerCapitalTemplate(
                  config.entityName,
                  config.partners || activeRows.map((r) => ({ name: r.partnerName, profitSharePercent: r.profitSharePercent }))
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 hover:border-emerald-400 font-semibold text-xs rounded-lg shadow-2xs transition"
              title="Download pre-formatted statutory Excel template"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Template</span>
            </button>
          </div>
        </div>

        {/* Live Statutory Reconciliation Ribbon */}
        <div className="px-6 py-2 bg-emerald-50/50 border-b border-emerald-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Balance Sheet Note 3 Target:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(targetNote3Total)}</span>
            </div>
            <div className="w-px h-3.5 bg-slate-300"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Schedule Total Closing Capital:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(totalScheduleClosing)}</span>
            </div>
            {!isProprietor ? (
              <>
                <div className="w-px h-3.5 bg-slate-300"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Profit Share (PSR%):</span>
                  <span className={`font-mono font-bold ${Math.abs(totalPsr - 100) < 0.1 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {totalPsr}%
                  </span>
                </div>
                <div className="w-px h-3.5 bg-slate-300"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Remun Share (RSR%):</span>
                  <span className={`font-mono font-bold ${Math.abs(totalRsr - 100) < 0.1 ? 'text-teal-700' : 'text-amber-700'}`}>
                    {totalRsr}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-px h-3.5 bg-slate-300"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Sole Proprietorship (100% Capital)
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isReconciled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reconciled with Balance Sheet</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Variance: {formatINR(Math.abs(variance))}</span>
                </span>
                <button
                  type="button"
                  onClick={handleAutoReconcileVariance}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-[11px] transition shadow-2xs"
                >
                  Auto-Reconcile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status / Alert Banner */}
        {statusMsg && (
          <div
            className={`px-6 py-2 text-xs flex items-center justify-between border-b ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : statusMsg.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : statusMsg.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: 10-COLUMN SCHEDULE GRID */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!isProprietor && (
                    <button
                      type="button"
                      onClick={handleAddPartner}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Partner</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSyncFromNote3Ledgers}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg transition"
                    title={isProprietor ? "Extract proprietor capital amounts from Note 3 Trial Balance accounts" : "Extract partners and amounts from Note 3 Trial Balance accounts"}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sync from Note 3 Ledgers</span>
                  </button>
                  {profitAndLoss?.profitAfterTax !== undefined && (
                    <button
                      type="button"
                      onClick={handleDistributePAT}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold text-xs rounded-lg transition"
                      title={isProprietor ? "Credit net profit after tax to Proprietor's Capital" : "Distribute net profit after tax to partners based on PSR %"}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isProprietor ? `Credit Net Profit (${formatINR(profitAndLoss.profitAfterTax)})` : `Distribute Net Profit (${formatINR(profitAndLoss.profitAfterTax)})`}</span>
                    </button>
                  )}
                  {!isProprietor && profitAndLoss?.partnersRemuneration !== undefined && profitAndLoss.partnersRemuneration > 0 && (
                    <button
                      type="button"
                      onClick={handleDistributeRemuneration}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-semibold text-xs rounded-lg transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Distribute Remuneration ({formatINR(profitAndLoss.partnersRemuneration)})</span>
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-slate-500 font-mono">
                  * All amounts in Indian Rupees (₹)
                </span>
              </div>

              {/* Editable Table */}
              <div className="overflow-x-auto border border-emerald-300/80 rounded-xl shadow-xs">
                <table className={`w-full text-left text-[11px] border-collapse ${isProprietor ? 'min-w-[850px]' : 'min-w-[1020px]'}`}>
                  <thead>
                    <tr className="bg-emerald-900 text-white font-semibold">
                      <th className="py-2.5 px-2 text-center w-10">Sr.</th>
                      <th className="py-2.5 px-3 min-w-[160px]">{isProprietor ? "Name of Proprietor" : "Name of Partner/ Proprietor"}</th>
                      {!isProprietor && (
                        <>
                          <th className="py-2.5 px-2 text-center w-18" title="Profit Sharing Ratio">Profit (%)</th>
                          <th className="py-2.5 px-2 text-center w-18" title="Remuneration Sharing Ratio u/s 40(b)">Remun (%)</th>
                        </>
                      )}
                      <th className="py-2.5 px-2 text-right min-w-[150px]">As at 1st April (Opening)</th>
                      <th className="py-2.5 px-2 text-right w-24">Capital Introduced</th>
                      {!isProprietor && (
                        <th className="py-2.5 px-2 text-right w-24">Remuneration</th>
                      )}
                      <th className="py-2.5 px-2 text-right w-22">{isProprietor ? "Interest on Capital" : "Interest"}</th>
                      <th className="py-2.5 px-2 text-right w-24">{isProprietor ? "Drawings / Withdrawals" : "Withdrawals"}</th>
                      <th className="py-2.5 px-2 text-right w-26">{isProprietor ? "Net Profit / (Loss) for the year" : "Share of Profit/Loss"}</th>
                      <th className="py-2.5 px-2 text-right w-28 font-bold text-emerald-200 bg-emerald-950">
                        As at 31st March (Closing)
                      </th>
                      {!isProprietor && <th className="py-2.5 px-2 text-center w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 bg-emerald-50/15 text-slate-800">
                    {activeRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white transition">
                        <td className="py-1.5 px-2 text-center font-mono text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.partnerName}
                            onChange={(e) => handleCellChange(idx, 'partnerName', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder={isProprietor ? "Proprietor Name" : "Partner Name"}
                          />
                        </td>
                        {!isProprietor && (
                          <>
                            <td className="py-1.5 px-1 text-center">
                              <div className="relative inline-flex items-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.profitSharePercent}
                                  onChange={(e) => handleCellChange(idx, 'profitSharePercent', e.target.value)}
                                  className="w-14 px-1 py-1 text-center bg-white border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] text-slate-400 ml-0.5">%</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-1 text-center">
                              <div className="relative inline-flex items-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.remunerationSharePercent !== undefined ? row.remunerationSharePercent : ''}
                                  placeholder={`${row.profitSharePercent || 0}`}
                                  onChange={(e) => handleCellChange(idx, 'remunerationSharePercent', e.target.value)}
                                  className="w-14 px-1 py-1 text-center bg-white border border-teal-200 rounded font-mono text-xs text-teal-900 focus:ring-1 focus:ring-teal-500"
                                  title="Remuneration Sharing % (defaults to Profit Share if blank)"
                                />
                                <span className="text-[10px] text-teal-600 ml-0.5">%</span>
                              </div>
                            </td>
                          </>
                        )}
                        <td className="py-1.5 px-1 text-right">
                          <div className="flex items-center gap-1 min-w-[145px]">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={Math.abs(row.openingBalance || 0) === 0 ? '' : Math.abs(row.openingBalance || 0)}
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                const currentNature = row.openingNature || ((row.openingBalance || 0) < 0 ? 'Dr' : 'Cr');
                                if (raw === '') {
                                  handleCellChange(idx, 'openingBalance', 0, currentNature);
                                  return;
                                }
                                let isDr = currentNature === 'Dr';
                                if (raw.startsWith('-')) {
                                  isDr = true;
                                }
                                const val = Math.abs(parseFloat(raw) || 0);
                                handleCellChange(idx, 'openingBalance', isDr ? -val : val, isDr ? 'Dr' : 'Cr');
                              }}
                              className={`w-full px-1.5 py-1 text-right bg-white border rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500 ${
                                (row.openingNature === 'Dr' || (row.openingBalance || 0) < 0)
                                  ? 'border-rose-300 text-rose-800'
                                  : 'border-slate-200 text-slate-900'
                              }`}
                              title={(row.openingNature === 'Dr' || (row.openingBalance || 0) < 0) ? 'Debit balance (Overdrawn/Deficit)' : 'Credit balance (Normal Capital)'}
                            />
                            <select
                              value={row.openingNature || ((row.openingBalance || 0) < 0 ? 'Dr' : 'Cr')}
                              onChange={(e) => handleCellChange(idx, 'openingNature', e.target.value as 'Cr' | 'Dr')}
                              className={`px-1.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer shrink-0 ${
                                (row.openingNature === 'Dr' || (row.openingBalance || 0) < 0)
                                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              }`}
                              title="Select Cr (Credit - Normal Capital) or Dr (Debit - Overdrawn/Deficit)"
                            >
                              <option value="Cr">Cr</option>
                              <option value="Dr">Dr</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-1.5 px-1 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.capitalIntroduced}
                            onChange={(e) => handleCellChange(idx, 'capitalIntroduced', e.target.value)}
                            className="w-full px-2 py-1 text-right bg-white border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        {!isProprietor && (
                          <td className="py-1.5 px-1 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.remuneration}
                              onChange={(e) => handleCellChange(idx, 'remuneration', e.target.value)}
                              className="w-full px-2 py-1 text-right bg-white border border-slate-200 rounded font-mono text-xs text-emerald-900 font-semibold focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                        )}
                        <td className="py-1.5 px-1 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.interestOnCapital}
                            onChange={(e) => handleCellChange(idx, 'interestOnCapital', e.target.value)}
                            className="w-full px-2 py-1 text-right bg-white border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-1.5 px-1 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.withdrawals}
                            onChange={(e) => handleCellChange(idx, 'withdrawals', e.target.value)}
                            className="w-full px-2 py-1 text-right bg-white border border-slate-200 rounded font-mono text-xs text-rose-800 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-1.5 px-1 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.shareOfProfit}
                            onChange={(e) => handleCellChange(idx, 'shareOfProfit', e.target.value)}
                            className="w-full px-2 py-1 text-right bg-white border border-slate-200 rounded font-mono text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-1.5 px-1 text-right bg-emerald-100/60">
                          <input
                            type="number"
                            step="0.01"
                            value={row.closingBalance}
                            onChange={(e) => handleCellChange(idx, 'closingBalance', e.target.value)}
                            className="w-full px-2 py-1 text-right bg-white border border-emerald-300 rounded font-mono text-xs font-bold text-slate-950 focus:ring-1 focus:ring-emerald-600"
                          />
                        </td>
                        {!isProprietor && (
                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePartner(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Delete Partner"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {/* TOTAL FOOTER ROW */}
                    <tr className="bg-emerald-100/95 font-bold text-emerald-950 border-t-2 border-emerald-300 text-xs">
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider">
                        Total ({period})
                      </td>
                      {!isProprietor && (
                        <>
                          <td className="py-2.5 px-2 text-center font-mono font-bold">
                            {totalPsr}%
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-teal-800">
                            {totalRsr}%
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-2 text-right font-mono font-bold">
                        <span className={totalOpening < 0 ? 'text-rose-800' : 'text-emerald-950'}>
                          {formatINR(Math.abs(totalOpening))} {totalOpening < 0 ? 'Dr' : 'Cr'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold">
                        {formatINR(totalIntroduced)}
                      </td>
                      {!isProprietor && (
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-900">
                          {formatINR(totalRemun)}
                        </td>
                      )}
                      <td className="py-2.5 px-2 text-right font-mono font-bold">
                        {formatINR(totalInterest)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-800">
                        ({formatINR(totalWithdrawals)})
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold">
                        {formatINR(totalProfitShare)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-950 bg-emerald-200">
                        {formatINR(totalScheduleClosing)}
                      </td>
                      {!isProprietor && <td></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD PARTNER LEDGER / STATEMENT */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                }`}
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-3 shadow-2xs">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Drag & drop Partner Capital Schedule or Ledger Statements
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Supports Excel (.xlsx, .xls) and CSV exported from Tally, Busy, or CA working papers. Automatically parses both summary tables and full ledger accounts.
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select File to Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadPartnerCapitalTemplate(
                        config.entityName,
                        config.partners || activeRows.map((r) => ({ name: r.partnerName, profitSharePercent: r.profitSharePercent }))
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl transition"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Download Excel Template</span>
                  </button>
                </div>
              </div>

              {/* Parsed Preview */}
              {parseResult && parseResult.partners.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Parsed {parseResult.partners.length} Partner(s) from "{uploadedFileName}" ({parseResult.format.toUpperCase()} FORMAT)
                      </span>
                    </h5>
                    <button
                      type="button"
                      onClick={handleApplyUploadedData}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition"
                    >
                      <span>Apply to Schedule</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-56">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2">Partner Name</th>
                          <th className="p-2 text-center">Share %</th>
                          <th className="p-2 text-right">Opening</th>
                          <th className="p-2 text-right">Introduced</th>
                          <th className="p-2 text-right">Remuneration</th>
                          <th className="p-2 text-right">Interest</th>
                          <th className="p-2 text-right">Withdrawals</th>
                          <th className="p-2 text-right">Share of Profit</th>
                          <th className="p-2 text-right font-bold">Closing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {parseResult.partners.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 font-sans font-semibold text-slate-900">{p.partnerName}</td>
                            <td className="p-2 text-center">{p.profitSharePercent}%</td>
                            <td className="p-2 text-right">{formatINR(p.openingBalance)}</td>
                            <td className="p-2 text-right">{formatINR(p.capitalIntroduced)}</td>
                            <td className="p-2 text-right text-emerald-800">{formatINR(p.remuneration)}</td>
                            <td className="p-2 text-right">{formatINR(p.interestOnCapital)}</td>
                            <td className="p-2 text-right text-rose-800">{formatINR(p.withdrawals)}</td>
                            <td className="p-2 text-right">{formatINR(p.shareOfProfit)}</td>
                            <td className="p-2 text-right font-bold text-slate-950 bg-emerald-50/50">
                              {formatINR(p.closingBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MAP TRIAL BALANCE LEDGERS */}
          {activeTab === 'ledger_mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Trial Balance Ledgers Mapped to Note 3 (Owners' Capital Account)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Assign each trial balance ledger account to a partner and statutory component.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyLedgerMappings}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Mappings to Schedule</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Trial Balance Ledger Account</th>
                      <th className="py-2.5 px-3">Sub-Schedule Category</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 w-56">Assign to Partner</th>
                      <th className="py-2.5 px-3 w-52">Assign Statutory Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(noteSchedule?.items || []).map((it, idx) => {
                      const itemKey = it.id || it.accountName;
                      const currentAssign = ledgerMappings[itemKey] || {
                        partnerName:
                          partnerNames.find((p) =>
                            it.accountName.toLowerCase().includes(p.toLowerCase())
                          ) || partnerNames[0] || '',
                        field: it.accountName.toLowerCase().includes('drawing')
                          ? 'withdrawals'
                          : it.accountName.toLowerCase().includes('remun') || it.accountName.toLowerCase().includes('salary')
                          ? 'remuneration'
                          : it.accountName.toLowerCase().includes('interest')
                          ? 'interestOnCapital'
                          : 'closingBalance',
                      };

                      const bal = Math.abs(it.displayBalance !== undefined ? it.displayBalance : it.netBalance);

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {it.accountName}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {it.subCategory || "Partners' Fixed Capital"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatINR(bal)}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={currentAssign.partnerName}
                              onChange={(e) =>
                                handleAssignLedger(itemKey, e.target.value, currentAssign.field)
                              }
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">-- Select Partner --</option>
                              {partnerNames.map((p, pIdx) => (
                                <option key={pIdx} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={currentAssign.field}
                              onChange={(e) =>
                                handleAssignLedger(
                                  itemKey,
                                  currentAssign.partnerName,
                                  e.target.value as keyof PartnerCapitalRecord
                                )
                              }
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="closingBalance">Closing Capital Balance</option>
                              <option value="openingBalance">Opening Capital Balance</option>
                              <option value="capitalIntroduced">Capital Introduced</option>
                              <option value="remuneration">Remuneration / Partner Salary</option>
                              <option value="interestOnCapital">Interest on Capital</option>
                              <option value="withdrawals">Drawings / Withdrawals</option>
                              <option value="shareOfProfit">Share of Profit / Loss</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Mandatory disclosure under Page 6 of the ICAI Guidance Note on Non-Corporate Entities.
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Apply Statutory Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
