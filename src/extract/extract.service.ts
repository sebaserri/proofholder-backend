import { Injectable } from "@nestjs/common";
import { TextractAdapter } from "./textract.adapter";
import { TesseractAdapter } from "./tesseract.adapter";
import { OcrAdapter, OcrResult } from "./ocr.adapter";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExtractService {
  private adapter: OcrAdapter;
  constructor(private prisma: PrismaService) {
    this.adapter =
      process.env.OCR_ENGINE === "tesseract"
        ? new TesseractAdapter()
        : new TextractAdapter();
  }

  async extractFromCoiId(id: string) {
    const coi = await this.prisma.cOI.findUnique({
      where: { id },
      include: { files: true, vendor: true, building: true },
    });
    if (!coi) throw new Error("COI not found");
    const cert = coi.files?.[0];
    if (!cert) throw new Error("No COI file found");

    const bucket = process.env.S3_BUCKET as string;
    const url = cert.fileUrl as string;
    const key =
      url.split(`${bucket}/`)[1] ||
      url.split("amazonaws.com/")[1] ||
      url;
    const res: OcrResult = await this.adapter.extractFromS3(bucket, key);

    return {
      insuredName: res.fields.insuredName,
      producer: res.fields.producer,
      effectiveDate: res.fields.effectiveDate,
      expirationDate: res.fields.expirationDate,
      generalLiabLimit: res.fields.generalLiabLimit,
      autoLiabLimit: res.fields.autoLiabLimit,
      umbrellaLimit: res.fields.umbrellaLimit,
      certificateHolder: res.fields.certificateHolder,
      confidence: res.confidence ?? 0,
      fields: res.fields,
    };
  }

  async applyToCoi(id: string, fields: any) {
    const coi = await this.prisma.cOI.findUnique({
      where: { id },
    });
    if (!coi) throw new Error("COI not found");

    const coverage = (coi.coverageAmounts as any) || {};

    const map = [
      "insuredName",
      "producer",
      "generalLiabLimit",
      "autoLiabLimit",
      "umbrellaLimit",
      "certificateHolder",
    ] as const;

    for (const k of map) {
      if (fields[k] !== undefined) {
        coverage[k] = fields[k];
      }
    }

    const data: any = {
      coverageAmounts: coverage,
    };

    if (fields.effectiveDate) {
      data.effectiveDate = new Date(fields.effectiveDate);
    }
    if (fields.expirationDate) {
      data.expirationDate = new Date(fields.expirationDate);
    }
    if (fields.producer !== undefined) {
      data.insuranceCompany = fields.producer;
    }

    const updated = await this.prisma.cOI.update({ where: { id }, data });
    return { ok: true, coiId: updated.id, appliedFields: Object.keys(data) };
  }
}
