import { ethers } from "ethers";

const ERC20ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)",
];

export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amountInWei: BigInt,
  signer: ethers.Signer
) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);

  const tx = await tokenContract.approve(spenderAddress, amountInWei);
  await tx.wait();
  console.log("Approved successfully");
}
