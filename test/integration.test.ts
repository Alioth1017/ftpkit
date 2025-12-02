import * as path from "node:path";
import { Client } from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FtpUpload } from "../src/index";

// Define mocks using vi.hoisted
const { mockFtpClient, mockSftpClient } = vi.hoisted(() => {
	return {
		mockFtpClient: {
			access: vi.fn(),
			uploadFrom: vi.fn(),
			ensureDir: vi.fn(),
			size: vi.fn().mockResolvedValue(0),
			lastMod: vi.fn().mockResolvedValue(new Date()),
			close: vi.fn(),
		},
		mockSftpClient: {
			connect: vi.fn(),
			put: vi.fn(),
			mkdir: vi.fn(),
			stat: vi.fn().mockResolvedValue({ size: 0, mtime: new Date() }),
			end: vi.fn(),
		},
	};
});

// Mock external dependencies
vi.mock("basic-ftp", () => {
	return {
		Client: vi.fn().mockImplementation(() => mockFtpClient),
	};
});

vi.mock("ssh2-sftp-client", () => {
	return {
		default: vi.fn().mockImplementation(() => mockSftpClient),
	};
});

// Do NOT mock fs here, we want to use real FS

describe("FtpUpload Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should upload files from real directory using FTP", async () => {
		const localDir = path.resolve(__dirname, "../test.upload");
		const options = {
			localDir: localDir,
			remoteDir: "/site/wwwroot",
			host: "ftp.example.com",
			user: "user",
			password: "password",
			mode: "ftp" as const,
			// If entries is not provided, it should upload everything in localDir?
			// Let's check implementation or provide entries if needed.
			// Based on previous test, entries was provided.
			// If I don't provide entries, does it scan?
			// Let's assume we need to provide entries or it scans.
			// Looking at src/index.ts, it passes options to FtpUploader.
			// Let's try without entries first, assuming it might scan or we can pass ["1.txt"]
			entries: ["1.txt"],
		};

		const uploader = new FtpUpload(options);
		await uploader.execute();

		expect(Client).toHaveBeenCalled();
		expect(mockFtpClient.access).toHaveBeenCalledWith(
			expect.objectContaining({
				host: "ftp.example.com",
				user: "user",
				password: "password",
			}),
		);

		// Verify uploadFrom was called for 1.txt
		// uploadFrom(source, remotePath)
		expect(mockFtpClient.uploadFrom).toHaveBeenCalledWith(
			expect.stringContaining("1.txt"),
			"/site/wwwroot/1.txt",
		);

		expect(mockFtpClient.close).toHaveBeenCalled();
	});

	it("should upload files from real directory using SSH", async () => {
		const localDir = path.resolve(__dirname, "../test.upload");
		const options = {
			localDir: localDir,
			remoteDir: "/site/wwwroot",
			host: "ssh.example.com",
			user: "user",
			password: "password",
			mode: "ssh" as const,
			entries: ["1.txt"],
		};

		const uploader = new FtpUpload(options);
		await uploader.execute();

		expect(SftpClient).toHaveBeenCalled();
		expect(mockSftpClient.connect).toHaveBeenCalledWith(
			expect.objectContaining({
				host: "ssh.example.com",
				username: "user",
				password: "password",
			}),
		);

		// Verify put was called for 1.txt
		// put(source, remotePath)
		expect(mockSftpClient.put).toHaveBeenCalledWith(
			expect.stringContaining("1.txt"),
			"/site/wwwroot/1.txt",
		);

		expect(mockSftpClient.end).toHaveBeenCalled();
	});
});
