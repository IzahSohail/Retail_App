import { prisma } from '../db.js';

export class FlashSaleService {
  /**
   * Create a new flash sale
   */
  static async createFlashSale(data) {
    const { title, description, discountType, discountValue, startsAt, endsAt, productIds = [] } = data;

    // Validate dates
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    
    if (start >= end) {
      throw new Error('Start date must be before end date');
    }

    // Validate discount value
    if (discountType === 'PERCENTAGE' && (discountValue < 1 || discountValue > 99)) {
      throw new Error('Percentage discount must be between 1 and 99');
    }

    if (discountType === 'FIXED' && discountValue < 1) {
      throw new Error('Fixed discount must be positive');
    }

    // Create flash sale
    const flashSale = await prisma.flashSale.create({
      data: {
        title,
        description,
        discountType,
        discountValue,
        startsAt: start,
        endsAt: end,
        items: {
          create: productIds.map(productId => ({
            productId
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    return flashSale;
  }

  /**
   * Get all flash sales
   */
  static async getAllFlashSales() {
    return await prisma.flashSale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                priceMinor: true,
                imageUrl: true,
                stock: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get active flash sales
   */
  static async getActiveFlashSales() {
    const now = new Date();
    return await prisma.flashSale.findMany({
      where: {
        startsAt: { lte: now },
        endsAt: { gte: now }
      },
      orderBy: { priority: 'desc' },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }

  /**
   * Get flash sale by ID
   */
  static async getFlashSaleById(id) {
    return await prisma.flashSale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }

  /**
   * Update flash sale products
   */
  static async updateFlashSaleProducts(flashSaleId, productIds) {
    // Delete existing items
    await prisma.flashSaleItem.deleteMany({
      where: { flashSaleId }
    });

    // Create new items
    await prisma.flashSaleItem.createMany({
      data: productIds.map(productId => ({
        flashSaleId,
        productId
      }))
    });

    return await this.getFlashSaleById(flashSaleId);
  }

  /**
   * Delete flash sale
   */
  static async deleteFlashSale(id) {
    return await prisma.flashSale.delete({
      where: { id }
    });
  }

  /**
   * Get flash sale for a product
   */
  static async getFlashSaleForProduct(productId) {
    const now = new Date();
    
    const flashSaleItem = await prisma.flashSaleItem.findFirst({
      where: {
        productId,
        flashSale: {
          startsAt: { lte: now },
          endsAt: { gte: now }
        }
      },
      include: {
        flashSale: true
      },
      orderBy: {
        flashSale: {
          priority: 'desc'
        }
      }
    });

    return flashSaleItem?.flashSale || null;
  }
}

